import { FunctionsHttpError } from '@supabase/supabase-js';

import { getSupabaseClient } from '../auth/supabaseClient.ts';
import type { CoachPromptParts } from './buildCoachPrompt.ts';
import {
  canAskCoachQuestion,
  coachQuestionLimitMessage,
} from './coachLimits.ts';

type CoachReplyResponse = {
  reply?: string;
  error?: string;
};

export type CoachReplyRequest = CoachPromptParts & {
  coachQuestionsAsked: number;
  /** JPEG data URL, already compressed client-side for vision API cost control. */
  photoDataUrl?: string;
};

export type CoachReplyResult =
  | { ok: true; reply: string }
  | { ok: false; message: string };

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
    return { ok: false, message: coachQuestionLimitMessage() };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      message: 'The baking coach needs Supabase to be configured before it can reply.',
    };
  }

  const { data, error } = await supabase.functions.invoke<CoachReplyResponse>('coach', {
    body: request,
  });

  if (error) {
    const detail = await readCoachInvokeError(error);
    const limitReached = /limit reached/i.test(detail);
    return {
      ok: false,
      message: limitReached ? coachQuestionLimitMessage() : `Coach is temporarily unavailable. (${detail})`,
    };
  }

  if (data?.error) {
    const limitReached = /limit reached/i.test(data.error);
    return {
      ok: false,
      message: limitReached ? coachQuestionLimitMessage() : `Coach is temporarily unavailable. (${data.error})`,
    };
  }

  if (!data?.reply?.trim()) {
    return { ok: false, message: 'Coach did not return a reply. Try again in a moment.' };
  }

  return { ok: true, reply: data.reply.trim() };
}
