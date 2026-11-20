import { getSlapAndFoldDurationMinutes } from './defaults.ts';
import { addMinutesToTime } from './time.ts';
import type { ScheduleInput, TimelineStep } from './types.ts';

import type { RecipeInput } from '../recipe/types.ts';

/*
  Editing a single step of the timeline.

  The timeline is not stored: it is built from the schedule settings (buildTimeline). So an edit changes
  the setting the step comes from, or, for one fold out of several, a per-fold override. After the edit
  buildTimeline lays everything out again, which is what shifts the later steps:

  - A step's duration changes -> every later step moves by the difference.
  - The last step of the bulk always runs until Pre-shape. Editing it moves Pre-shape instead.
  - A step's start changes -> the step before it absorbs the difference, so there is never a gap.
  - The bake time of a cold schedule is anchored, so the cold retard takes up any shift.

  Pass the raw timeline from buildTimeline, not the merged display timeline. Functions return the new
  schedule, or null when the edit cannot be honoured (the caller shows a message and keeps the old one).
*/

/** Steps before the mix, anchored backwards from it. They are changed with the levain settings. */
const PREP_STEP_IDS = new Set(['refresh-starter', 'build-levain']);

const FOLD_STEP_ID = /^(stretch|coil)-fold-\d+$/;
const BAKE_STEP_ID = /^bake-/;
const BULK_REST_IDS = new Set(['rest-after-levain', 'rest-after-salt']);

/**
 * The merged "Mix in salt and rest" row of the display timeline edits the rest. Returns the id to pass
 * to the edit functions for a step of the display timeline.
 */
export function getEditableStepId(displayStepId: string): string {
  if (displayStepId === 'mix-levain-rest-after-levain') return 'rest-after-levain';
  if (displayStepId === 'mix-salt-rest-after-salt') return 'rest-after-salt';
  return displayStepId;
}

export function canEditStepDuration(step: TimelineStep): boolean {
  if (step.durationMinutes <= 0 || PREP_STEP_IDS.has(step.id)) {
    return false;
  }

  return (
    step.id === 'autolyse' ||
    BULK_REST_IDS.has(step.id) ||
    step.id === 'slap-and-fold' ||
    FOLD_STEP_ID.test(step.id) ||
    step.id === 'pre-shape' ||
    step.id === 'room-proof' ||
    BAKE_STEP_ID.test(step.id)
  );
}

function isWholeMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 1;
}

/** The step that is still running when Pre-shape starts: editing it moves Pre-shape. */
function runsUntilPreShape(step: TimelineStep, timeline: TimelineStep[]): boolean {
  const preShape = timeline.find((candidate) => candidate.id === 'pre-shape');
  return (
    step.id !== 'pre-shape' &&
    preShape !== undefined &&
    step.startOffsetMinutes + step.durationMinutes === preShape.startOffsetMinutes
  );
}

export function setStepDuration(
  schedule: ScheduleInput,
  _recipeInput: RecipeInput,
  timeline: TimelineStep[],
  stepId: string,
  durationMinutes: number,
): ScheduleInput | null {
  const step = timeline.find((candidate) => candidate.id === stepId);

  if (!step || !canEditStepDuration(step) || !isWholeMinutes(durationMinutes)) {
    return null;
  }

  if (runsUntilPreShape(step, timeline)) {
    const shape = timeline.find((candidate) => candidate.id === 'shape');
    if (!shape) {
      return null;
    }
    const preShapeMinutes = shape.startOffsetMinutes - (step.startOffsetMinutes + durationMinutes);
    return isWholeMinutes(preShapeMinutes)
      ? { ...schedule, preShapeMinutesBeforeBulkEnd: preShapeMinutes }
      : null;
  }

  switch (step.id) {
    case 'autolyse':
      return { ...schedule, autolyseMinutes: durationMinutes };
    case 'rest-after-levain':
      return { ...schedule, restAfterLevainMinutes: durationMinutes };
    case 'rest-after-salt':
      return { ...schedule, restAfterSaltMinutes: durationMinutes };
    case 'slap-and-fold': {
      const restMinutes = durationMinutes - getSlapAndFoldDurationMinutes(schedule.slapAndFolds);
      return restMinutes >= 0 ? { ...schedule, restAfterSlapAndFoldMinutes: restMinutes } : null;
    }
    case 'pre-shape':
      return { ...schedule, preShapeMinutesBeforeBulkEnd: durationMinutes };
    case 'room-proof':
      return { ...schedule, roomProofHours: durationMinutes / 60 };
    case 'bake-closed':
      return { ...schedule, dutchOvenClosedMinutes: durationMinutes };
    case 'bake-lid-off':
      return { ...schedule, dutchOvenLidOffMinutes: durationMinutes };
    case 'bake-out-of-pot':
      return { ...schedule, dutchOvenOutOfPotMinutes: durationMinutes };
    case 'bake-open':
      return { ...schedule, openBakeMinutes: durationMinutes };
    case 'bake-finish':
      return { ...schedule, finishMinutes: durationMinutes };
    default:
      break;
  }

  if (FOLD_STEP_ID.test(step.id)) {
    return {
      ...schedule,
      foldRestMinutesByStep: { ...schedule.foldRestMinutesByStep, [step.id]: durationMinutes },
    };
  }

  return null;
}

/** Moves a step's start. The step before it takes the difference; the first step changes the start time. */
export function setStepStart(
  schedule: ScheduleInput,
  recipeInput: RecipeInput,
  timeline: TimelineStep[],
  stepId: string,
  startOffsetMinutes: number,
): ScheduleInput | null {
  const index = timeline.findIndex((candidate) => candidate.id === stepId);
  const step = timeline[index];

  if (!step || !Number.isInteger(startOffsetMinutes) || PREP_STEP_IDS.has(step.id)) {
    return null;
  }

  const delta = startOffsetMinutes - step.startOffsetMinutes;
  if (delta === 0) {
    return schedule;
  }

  const before = timeline
    .slice(0, index)
    .filter((candidate) => candidate.durationMinutes > 0 && !PREP_STEP_IDS.has(candidate.id));
  const previous = before[before.length - 1];

  if (!previous) {
    return { ...schedule, startTime: addMinutesToTime(schedule.startTime, delta) };
  }

  // A marker such as "Mix in salt" starts exactly when the step before it ends.
  if (previous.startOffsetMinutes + previous.durationMinutes !== step.startOffsetMinutes) {
    return null;
  }

  return setStepDuration(schedule, recipeInput, timeline, previous.id, previous.durationMinutes + delta);
}

