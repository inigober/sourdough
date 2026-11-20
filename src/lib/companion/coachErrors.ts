import { coachQuestionLimitMessage } from './coachLimits.ts';

export type CoachFailureReason =
  | 'limit'
  | 'daily-limit'
  | 'sign-in'
  | 'not-configured'
  | 'empty-reply'
  | 'unavailable';

/** Maps a raw server or network error string to a reason the UI can explain. Raw text is never shown to bakers. */
export function classifyCoachErrorDetail(detail: string): CoachFailureReason {
  // Match the server's own wording only: an OpenAI "Rate limit reached" is not the baker's quota.
  if (/question limit reached/i.test(detail)) {
    return 'limit';
  }

  // The server's own wording again (supabase/functions/coach/usageRules.ts).
  if (/daily coach limit reached/i.test(detail)) {
    return 'daily-limit';
  }

  if (/sign in required/i.test(detail)) {
    return 'sign-in';
  }

  if (/not configured/i.test(detail)) {
    return 'not-configured';
  }

  return 'unavailable';
}

/**
 * Friendly copy for each failure. The "retry" cases say the question was kept and
 * not counted, which is true: the quota is only spent after a successful reply.
 */
export function getCoachFailureMessage(reason: CoachFailureReason): string {
  switch (reason) {
    case 'limit':
      return coachQuestionLimitMessage();
    case 'daily-limit':
      return "You've reached today's coach limit. Try again tomorrow. The tips above still work.";
    case 'sign-in':
      return 'Sign in to ask the baking coach. The tips above work without an account.';
    case 'not-configured':
      return 'The baking coach is not available right now. Use the tips above and trust what you see in the dough.';
    case 'empty-reply':
      return "The coach didn't have an answer that time. Your question is still in the box and wasn't counted, so you can try again.";
    case 'unavailable':
      return "Couldn't reach the coach. Check your connection and try again. Your question is still in the box and wasn't counted.";
  }
}

/** Only these failures are worth a Retry button; the others will not change by tapping again. */
export function isRetryableCoachFailure(reason: CoachFailureReason): boolean {
  return reason === 'unavailable' || reason === 'empty-reply';
}
