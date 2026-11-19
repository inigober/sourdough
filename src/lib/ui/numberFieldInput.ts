import { formatNumberDraft, getStepDecimalPlaces, stepNumberValue } from './numberFieldStep.ts';

/**
 * Pure rules behind NumberField, kept out of the component so they can be tested without a DOM.
 *
 * Two modes:
 * - Legacy (keepOutOfRange = false): typed numbers are clamped into min/max and a cleared field turns
 *   into the minimum on blur. Used by fields that have no validation messages of their own
 *   (the schedule builder).
 * - keepOutOfRange = true: the user's text is never rewritten. An out-of-range number is reported
 *   as typed and a cleared field is reported as NaN, so the validator can show a message and
 *   block Continue until the user fixes it.
 */

export type NumberFieldBounds = {
  step: number;
  min?: number;
  max?: number;
};

export type CommittedNumber = {
  value: number;
  draft: string;
};

function clampToBounds(value: number, { min, max }: NumberFieldBounds): number {
  let next = value;

  if (min !== undefined) {
    next = Math.max(min, next);
  }

  if (max !== undefined) {
    next = Math.min(max, next);
  }

  return next;
}

/** NaN for "", "-", "." and anything else that is not a real number yet. */
function readDraft(draft: string): number {
  if (draft.trim() === '') {
    return Number.NaN;
  }

  const parsed = Number(draft);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function roundToStep(value: number, step: number): number {
  return getStepDecimalPlaces(step) === 0 ? Math.round(value) : stepNumberValue(value, 0, step);
}

/**
 * The value to report on every keystroke, or null when nothing should be reported yet
 * (legacy mode while the field has no number).
 */
export function getValueWhileTyping(
  draft: string,
  bounds: NumberFieldBounds,
  keepOutOfRange: boolean,
): number | null {
  const parsed = readDraft(draft);

  if (keepOutOfRange) {
    return parsed;
  }

  return Number.isNaN(parsed) ? null : clampToBounds(parsed, bounds);
}

/** What to report and display when the user leaves the field. */
export function commitNumberDraft(
  draft: string,
  bounds: NumberFieldBounds,
  keepOutOfRange: boolean,
): CommittedNumber {
  const parsed = readDraft(draft);

  if (Number.isNaN(parsed)) {
    if (keepOutOfRange) {
      // Keep exactly what the user typed (usually nothing) so they can see what to fix.
      return { value: Number.NaN, draft };
    }

    const fallback = bounds.min ?? 0;
    return { value: fallback, draft: formatNumberDraft(fallback, bounds.step) };
  }

  const inRange = keepOutOfRange ? parsed : clampToBounds(parsed, bounds);
  const value = roundToStep(inRange, bounds.step);
  return { value, draft: formatNumberDraft(value, bounds.step) };
}

/**
 * Stepper buttons are an explicit action, so they always land inside min/max,
 * including from a cleared (NaN) or out-of-range field.
 */
export function stepWithinBounds(current: number, delta: number, bounds: NumberFieldBounds): number {
  const from = Number.isFinite(current) ? current : (bounds.min ?? 0);

  return clampToBounds(stepNumberValue(from, delta, bounds.step), bounds);
}

/**
 * Messages (and the red or amber card border) wait until the user leaves the field, so typing
 * "78" does not flash an "under 50" error on the "7". The exception is a number above max:
 * adding digits can never fix it, so say so straight away.
 */
export function shouldHoldFieldMessage({
  isFocused,
  draft,
  max,
}: {
  isFocused: boolean;
  draft: string;
  max?: number;
}): boolean {
  if (!isFocused) {
    return false;
  }

  const parsed = readDraft(draft);
  return !(max !== undefined && Number.isFinite(parsed) && parsed > max);
}
