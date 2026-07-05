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

export function isBakeTimerTestOverrideActiveForStep(step: TimelineStep): boolean {
  return getBakeTimerTestOverrideMinutes(step) !== null;
}
