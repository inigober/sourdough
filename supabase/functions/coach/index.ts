import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-retry-count, x-region',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

const MAX_QUESTIONS_PER_BAKE = 5;
const MAX_OUTPUT_TOKENS = 280;

type CoachRequest = {
  system: string;
  user: string;
  coachQuestionsAsked?: number;
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
          // Client already scales to ~1024px; low detail keeps vision token cost predictable.
          detail: 'low',
        },
      },
    ],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { system, user, coachQuestionsAsked = 0, photoDataUrl } = (await req.json()) as CoachRequest;

    if (!system?.trim() || !user?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing coach prompt content.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (coachQuestionsAsked >= MAX_QUESTIONS_PER_BAKE) {
      return new Response(
        JSON.stringify({
          error: `Question limit reached (${MAX_QUESTIONS_PER_BAKE} per bake).`,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Coach is not configured on the server.' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, buildUserMessage(user, photoDataUrl)],
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: errorText || 'OpenAI request failed.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await response.json();
    const reply = payload.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return new Response(JSON.stringify({ error: 'OpenAI returned an empty reply.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
