import type { TimelineStep } from '../schedule/types.ts';

function parseOptionalPositiveInt(raw: string | undefined): number | null {
  if (!raw?.trim()) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
}

const testMinutes = parseOptionalPositiveInt(import.meta.env?.VITE_BAKE_TIMER_TEST_MINUTES);
const testStepId = import.meta.env?.VITE_BAKE_TIMER_TEST_STEP_ID?.trim() || null;

export function getBakeTimerTestOverrideMinutes(step: TimelineStep): number | null {
  if (testMinutes === null || step.durationMinutes <= 0) {
    return null;
  }

  if (testStepId && step.id !== testStepId) {
    return null;
  }

  return testMinutes;
}

export function getEffectiveStepDurationMinutes(step: TimelineStep): number {
  return getBakeTimerTestOverrideMinutes(step) ?? step.durationMinutes;
}

/**
 * User-facing note shown in bake mode while a test override is active.
 * The developer hint (env var name, local env file) is only included in dev builds,
 * so production bundles never carry that wording.
 */
export function getBakeTimerTestOverrideNotice(minutes: number): string {
  return `Test mode: this step's timer runs for ${minutes} minute${minutes === 1 ? '' : 's'}.${DEV_ONLY_HINT}`;
}

// Must stay a module-level constant guarded by import.meta.env.DEV so Vite removes the
// string from production bundles. (Not set under the Node test runner, where env is undefined.)
const DEV_ONLY_HINT = import.meta.env?.DEV
  ? ' Remove VITE_BAKE_TIMER_TEST_MINUTES from .env.local to use the real duration.'
  : '';

export function isBakeTimerTestOverrideActiveForStep(step: TimelineStep): boolean {
  return getBakeTimerTestOverrideMinutes(step) !== null;
}
