// Pure rules for the coach edge function. No Deno or Supabase imports, so Node tests can run them
// (see src/lib/companion/coachServerRules.test.ts).

export const MAX_QUESTIONS_PER_BAKE = 5;
/** Rolling 24 hours, per user, across all bakes. Caps spend if someone scripts the endpoint. */
export const MAX_QUESTIONS_PER_DAY = 25;

export const DAY_MS = 24 * 60 * 60 * 1000;

// Generous ceilings, well above what the app sends, so a real prompt is never cut off.
export const MAX_SYSTEM_CHARS = 12_000;
export const MAX_USER_CHARS = 8_000;
/** The app compresses photos to about 500 KB; a base64 data URL is about a third larger. */
export const MAX_PHOTO_CHARS = 900_000;
export const MAX_BAKE_SESSION_ID_CHARS = 100;

export type RuleResult = { ok: true } | { ok: false; status: number; error: string };

/** Extracts the token from an `Authorization: Bearer <token>` header. */
export function readBearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

export function checkRequestSize(input: {
  system: string;
  user: string;
  photoDataUrl?: string;
  bakeSessionId?: string;
}): RuleResult {
  if (
    input.system.length > MAX_SYSTEM_CHARS ||
    input.user.length > MAX_USER_CHARS ||
    (input.photoDataUrl?.length ?? 0) > MAX_PHOTO_CHARS ||
    (input.bakeSessionId?.length ?? 0) > MAX_BAKE_SESSION_ID_CHARS
  ) {
    return { ok: false, status: 413, error: 'Coach request is too large.' };
  }

  return { ok: true };
}

/**
 * `askedForBake` is null when the app did not send a bake id (an older app version): only the daily cap applies then.
 * The wording of the two 429 messages is matched by the app (coachErrors.ts), so keep them in sync.
 */
export function checkUsageLimits(input: { askedForBake: number | null; askedToday: number }): RuleResult {
  if (input.askedForBake !== null && input.askedForBake >= MAX_QUESTIONS_PER_BAKE) {
    return { ok: false, status: 429, error: `Question limit reached (${MAX_QUESTIONS_PER_BAKE} per bake).` };
  }

  if (input.askedToday >= MAX_QUESTIONS_PER_DAY) {
    return { ok: false, status: 429, error: 'Daily coach limit reached. Try again tomorrow.' };
  }

  return { ok: true };
}
