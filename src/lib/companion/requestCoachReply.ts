import { FunctionsHttpError } from '@supabase/supabase-js';

import { getSupabaseClient } from '../auth/supabaseClient.ts';
import type { CoachPromptParts } from './buildCoachPrompt.ts';
import {
  classifyCoachErrorDetail,
  getCoachFailureMessage,
  type CoachFailureReason,
} from './coachErrors.ts';
import { canAskCoachQuestion } from './coachLimits.ts';

type CoachReplyResponse = {
  reply?: string;
  error?: string;
};

export type CoachReplyRequest = CoachPromptParts & {
  /** Used only for the quick local check; the server counts questions itself and is the real limit. */
  coachQuestionsAsked: number;
  /** Lets the server count questions per bake. */
  bakeSessionId: string;
  /** JPEG data URL, already compressed client-side for vision API cost control. */
  photoDataUrl?: string;
};

export type CoachReplyResult =
  | { ok: true; reply: string }
  | { ok: false; reason: CoachFailureReason; message: string };

function failure(reason: CoachFailureReason): CoachReplyResult {
  return { ok: false, reason, message: getCoachFailureMessage(reason) };
}

async function readCoachInvokeError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError && error.context instanceof Response) {
    try {
      const payload = (await error.context.json()) as { error?: string };
      if (payload.error?.trim()) {
        return payload.error.trim();
      }
    } catch {
      // Fall back to the generic invoke error below.
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown coach error';
}

export async function requestCoachReply(request: CoachReplyRequest): Promise<CoachReplyResult> {
  if (!canAskCoachQuestion(request.coachQuestionsAsked)) {
    return failure('limit');
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return failure('not-configured');
  }

  // The server only answers signed-in users. Check here too so a signed-out tap does not make a pointless call.
  const { data: authData } = await supabase.auth.getSession();
  if (!authData.session) {
    return failure('sign-in');
  }

  const { data, error } = await supabase.functions.invoke<CoachReplyResponse>('coach', {
    body: request,
  });

  if (error) {
    const detail = await readCoachInvokeError(error);
    // Raw detail is for the developer console only; bakers see friendly copy.
    console.warn('[coach] request failed:', detail);
    return failure(classifyCoachErrorDetail(detail));
  }

  if (data?.error) {
    console.warn('[coach] request failed:', data.error);
    return failure(classifyCoachErrorDetail(data.error));
  }

  if (!data?.reply?.trim()) {
    console.warn('[coach] empty reply');
    return failure('empty-reply');
  }

  return { ok: true, reply: data.reply.trim() };
}
