import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

import {
  DAY_MS,
  checkRequestSize,
  checkUsageLimits,
  readBearerToken,
} from './usageRules.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-retry-count, x-region',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

const MAX_OUTPUT_TOKENS = 280;

type CoachRequest = {
  system: string;
  user: string;
  /** Lets the server count questions per bake. */
  bakeSessionId?: string;
  photoDataUrl?: string;
};

type OpenAiChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | {
      role: 'user';
      content: Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string; detail: 'low' | 'high' | 'auto' } }
      >;
    };

function buildUserMessage(user: string, photoDataUrl?: string): OpenAiChatMessage {
  if (!photoDataUrl?.trim()) {
    return { role: 'user', content: user };
  }

  return {
    role: 'user',
    content: [
      { type: 'text', text: user },
      {
        type: 'image_url',
        image_url: {
          url: photoDataUrl.trim(),
          // Client scales by coach topic; auto lets the model pick resolution for crumb vs dough shots.
          detail: 'auto',
        },
      },
    ],
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Access to this function is checked here, not by the gateway's `verify_jwt` (see supabase/config.toml):
// the check needs a clear 401 message for the app, and it has to work with the project's key setup.
// The service-role client is used only to look up the user and to read and write `coach_usage`,
// a table the app's own keys cannot touch.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!supabaseUrl || !serviceRoleKey || !apiKey) {
      return json({ error: 'Coach is not configured on the server.' }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // 1. Only signed-in users. A signed-out app sends the public key as the bearer, which is not a user token.
    const token = readBearerToken(req.headers.get('Authorization'));
    const { data: authData, error: authError } = token
      ? await admin.auth.getUser(token)
      : { data: { user: null }, error: null };
    const user = authData.user;
    if (authError || !user) {
      return json({ error: 'Sign in required to use the coach.' }, 401);
    }

    // 2. Request shape and size.
    const { system, user: question, bakeSessionId, photoDataUrl } = (await req.json()) as CoachRequest;
    if (!system?.trim() || !question?.trim()) {
      return json({ error: 'Missing coach prompt content.' }, 400);
    }

    const sizeCheck = checkRequestSize({ system, user: question, photoDataUrl, bakeSessionId });
    if (!sizeCheck.ok) {
      return json({ error: sizeCheck.error }, sizeCheck.status);
    }

    // 3. Limits, counted from rows this function wrote (never from numbers the app sends).
    const dayStart = new Date(Date.now() - DAY_MS).toISOString();
    const [bakeCount, dayCount] = await Promise.all([
      bakeSessionId
        ? admin
            .from('coach_usage')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('bake_session_id', bakeSessionId)
        : Promise.resolve(null),
      admin
        .from('coach_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('asked_at', dayStart),
    ]);

    if (bakeCount?.error || dayCount.error) {
      console.error('coach usage lookup failed', bakeCount?.error ?? dayCount.error);
      return json({ error: 'Coach is temporarily unavailable.' }, 500);
    }

    const limitCheck = checkUsageLimits({
      askedForBake: bakeCount ? (bakeCount.count ?? 0) : null,
      askedToday: dayCount.count ?? 0,
    });
    if (!limitCheck.ok) {
      return json({ error: limitCheck.error }, limitCheck.status);
    }

    // 4. Ask the model.
    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, buildUserMessage(question, photoDataUrl)],
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI request failed', response.status, await response.text());
      return json({ error: 'Coach request failed.' }, 502);
    }

    const payload = await response.json();
    const reply = payload.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return json({ error: 'OpenAI returned an empty reply.' }, 502);
    }

    // 5. Count the question only now that it was answered, so a failed call never costs the baker a slot.
    const { error: insertError } = await admin
      .from('coach_usage')
      .insert({ user_id: user.id, bake_session_id: bakeSessionId ?? null });
    if (insertError) {
      // The reply is still returned; the question just is not counted. Worth knowing about.
      console.error('coach usage insert failed', insertError);
    }

    return json({ reply });
  } catch (error) {
    console.error('coach function error', error);
    return json({ error: 'Coach request failed.' }, 500);
  }
});
