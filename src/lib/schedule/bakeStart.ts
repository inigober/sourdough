import type { RecipeInput } from '../recipe/types.ts';
import { buildTimeline, formatTimelineForDisplay } from './buildTimeline.ts';
import { getTodayIsoDate, getTomorrowIsoDate } from './dates.ts';
import { formatClockTime, formatOffsetDateTime } from './mixDateTime.ts';
import { parseTimeToMinutes } from './scheduleTiming.ts';
import type { ScheduleInput } from './types.ts';

/** The real mix date and time picked when a bake starts. */
export type BakeStartChoice = {
  mixDate: string;
  startTime: string;
};

export type BakeStartPreview = {
  firstStep: { label: string; when: string } | null;
  mix: string | null;
  oven: string | null;
};

/** Suggests today if the recipe's usual start time is still ahead, otherwise tomorrow. */
export function getDefaultBakeStart(typicalStartTime: string, now = new Date()): BakeStartChoice {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startsLaterToday = parseTimeToMinutes(typicalStartTime) > nowMinutes;

  return {
    mixDate: startsLaterToday ? getTodayIsoDate(now) : getTomorrowIsoDate(now),
    startTime: typicalStartTime,
  };
}

export function applyBakeStart(schedule: ScheduleInput, choice: BakeStartChoice): ScheduleInput {
  return { ...schedule, mixDate: choice.mixDate, startTime: choice.startTime };
}

export function isBakeStartChoiceValid(choice: BakeStartChoice): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(choice.mixDate) && /^\d{1,2}:\d{2}$/.test(choice.startTime);
}

/** Real date and time for the first step, mixing, and the oven, for the chosen start. */
export function previewBakeStart(
  schedule: ScheduleInput,
  recipeInput: RecipeInput,
  choice: BakeStartChoice,
): BakeStartPreview {
  const scheduled = applyBakeStart(schedule, choice);
  const steps = formatTimelineForDisplay(buildTimeline(scheduled, recipeInput));
  const firstStep = steps[0];
  const mixStep = steps.find((step) => step.startOffsetMinutes === 0);
  const ovenStep = steps.find((step) => step.id.startsWith('bake-'));

  const whenLabel = (offsetMinutes: number): string =>
    formatDateTimeLabel(new Date(formatOffsetDateTime(scheduled, offsetMinutes).iso));

  return {
    firstStep: firstStep
      ? { label: firstStep.label, when: whenLabel(firstStep.startOffsetMinutes) }
      : null,
    mix: mixStep ? whenLabel(mixStep.startOffsetMinutes) : null,
    oven: ovenStep ? whenLabel(ovenStep.startOffsetMinutes) : null,
  };
}

function formatDateTimeLabel(date: Date): string {
  const day = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day}, ${formatClockTime(date)}`;
}
