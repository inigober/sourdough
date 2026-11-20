import { buildTimeline } from './buildTimeline.ts';
import { canEditStepDuration, getEditableStepId, setStepDuration, setStepStart } from './stepEdits.ts';
import { parseTimeToMinutes } from './time.ts';
import type { ScheduleInput, TimelineStep } from './types.ts';

import type { RecipeInput } from '../recipe/types.ts';

/*
  Pure helpers behind the tap-to-edit panel of the bake plan timeline. The screen only collects a typed
  start time or duration and shows the result; everything that decides what happens lives here.
*/

const MINUTES_PER_DAY = 24 * 60;
const CLOCK_TIME = /^\d{1,2}:\d{2}$/;

/** "3 h 25 min", "45 min", "2 h". */
export function formatMinutesReadable(totalMinutes: number): string {
  const rounded = Math.round(Math.abs(totalMinutes));
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} h ${minutes} min`;
  }

  return hours > 0 ? `${hours} h` : `${minutes} min`;
}

/** Signed minutes from one clock time to another, taking the short way round midnight (-720 < d <= 720). */
function getClockDeltaMinutes(fromClock: string, toClock: string): number {
  const delta =
    (((parseTimeToMinutes(toClock) - parseTimeToMinutes(fromClock)) % MINUTES_PER_DAY) + MINUTES_PER_DAY) %
    MINUTES_PER_DAY;
  return delta > MINUTES_PER_DAY / 2 ? delta - MINUTES_PER_DAY : delta;
}

/**
 * A clock time has no day, so a typed "00:15" could mean tonight or tomorrow. The step offset is the
 * nearest equivalent within 12 hours of the step's current start. Unreadable input means no change.
 */
export function getOffsetForClockTime(
  currentStartOffsetMinutes: number,
  currentClockTime: string,
  typedClockTime: string,
): number {
  if (!CLOCK_TIME.test(typedClockTime.trim())) {
    return currentStartOffsetMinutes;
  }

  return currentStartOffsetMinutes + getClockDeltaMinutes(currentClockTime, typedClockTime.trim());
}

/**
 * One plain sentence about what an edit moved, by comparing the timeline before and after.
 * Only the steps after the edited one are described: they either move together or stay where they are.
 */
export function describeTimelineShift(
  before: TimelineStep[],
  after: TimelineStep[],
  editedStepId: string,
): string {
  const editedIndex = before.findIndex((step) => step.id === editedStepId);
  const later = before.slice(editedIndex + 1).flatMap((oldStep) => {
    const newStep = after.find((candidate) => candidate.id === oldStep.id);
    return newStep
      ? [{ step: newStep, shift: getClockDeltaMinutes(oldStep.startTime, newStep.startTime) }]
      : [];
  });

  const firstMovedIndex = later.findIndex((entry) => entry.shift !== 0);
  if (firstMovedIndex === -1) {
    return 'No other steps move.';
  }

  const shift = later[firstMovedIndex].shift;
  const direction = shift > 0 ? 'later' : 'earlier';
  const stays = later.slice(firstMovedIndex).find((entry) => entry.shift === 0 && entry.step.durationMinutes > 0);
  const moved = `Later steps move ${formatMinutesReadable(shift)} ${direction}`;

  return stays ? `${moved}; ${stays.step.label} stays at ${stays.step.startTime}.` : `${moved}.`;
}

export type StepChange = { startTime?: string; durationMinutes?: number };

export type StepEditResult =
  | { ok: true; schedule: ScheduleInput; summary: string }
  | { ok: false; reason: string };

const NOT_HERE = "This step can't be changed here.";

function refuse(reason: string): StepEditResult {
  return { ok: false, reason };
}

/** Why a duration edit was refused, in words the baker can act on. */
function getDurationRefusalReason(step: TimelineStep, timeline: TimelineStep[], minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 1) {
    return 'Use whole minutes, at least 1.';
  }

  const preShape = timeline.find((candidate) => candidate.id === 'pre-shape');
  if (
    preShape &&
    step.id !== 'pre-shape' &&
    step.startOffsetMinutes + step.durationMinutes === preShape.startOffsetMinutes
  ) {
    return `${NOT_HERE} That would run past Shape. Try a shorter time.`;
  }

  return `${NOT_HERE} Try a different time.`;
}

/**
 * Applies a typed start time or duration to one step. Pass the RAW timeline from buildTimeline and the
 * id of the row that was tapped (a merged display id is mapped to the rest it edits). The result is the
 * new schedule with a one-sentence summary, or the reason the edit was refused (the old schedule stays).
 */
export function applyStepEdit(
  schedule: ScheduleInput,
  recipeInput: RecipeInput,
  timeline: TimelineStep[],
  displayStepId: string,
  change: StepChange,
): StepEditResult {
  const stepId = getEditableStepId(displayStepId);
  const step = timeline.find((candidate) => candidate.id === stepId);

  if (!step) {
    return refuse(NOT_HERE);
  }

  if (step.id === 'cold-retard') {
    return refuse(`${NOT_HERE} Change the bake time instead.`);
  }

  if (!canEditStepDuration(step)) {
    return refuse(NOT_HERE);
  }

  let next: ScheduleInput | null;
  if (change.durationMinutes !== undefined) {
    next = setStepDuration(schedule, recipeInput, timeline, stepId, change.durationMinutes);
    if (!next) {
      return refuse(getDurationRefusalReason(step, timeline, change.durationMinutes));
    }
  } else if (change.startTime !== undefined) {
    const offset = getOffsetForClockTime(step.startOffsetMinutes, step.startTime, change.startTime);
    next = setStepStart(schedule, recipeInput, timeline, stepId, offset);
    if (!next) {
      return refuse(`${NOT_HERE} Change the step before it instead.`);
    }
  } else {
    return { ok: true, schedule, summary: 'No other steps move.' };
  }

  try {
    return { ok: true, schedule: next, summary: describeTimelineShift(timeline, buildTimeline(next, recipeInput), stepId) };
  } catch {
    return refuse(NOT_HERE);
  }
}

/**
 * Per-fold rest overrides belong to one particular fold layout. When the baker changes how many folds
 * there are or how long the folds rest, the overrides would point at the wrong folds, so they are dropped.
 */
const FOLD_LAYOUT_FIELDS = [
  'stretchAndFoldSets',
  'coilFoldSets',
  'stretchAndFoldRestMinutes',
  'coilFoldRestMinutes',
] as const satisfies readonly (keyof ScheduleInput)[];

export function withFoldOverridesCleared(patch: Partial<ScheduleInput>): Partial<ScheduleInput> {
  return FOLD_LAYOUT_FIELDS.some((field) => field in patch)
    ? { ...patch, foldRestMinutesByStep: undefined }
    : patch;
}

/** True for the rows the baker can tap: a step with a length they control. Markers, Shape and cold retard are plain rows. */
export function isDisplayStepEditable(rawTimeline: TimelineStep[], displayStepId: string): boolean {
  const step = rawTimeline.find((candidate) => candidate.id === getEditableStepId(displayStepId));
  return step !== undefined && canEditStepDuration(step);
}
