import type { RecipeInput } from '../recipe/types.ts';
import { buildTimeline, formatTimelineForDisplay } from './buildTimeline.ts';
import { getTodayIsoDate, getTomorrowIsoDate, parseIsoDate } from './dates.ts';
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

/** A start this many minutes ago or less still counts as "now" (picking a time takes a moment). */
export const PAST_START_GRACE_MINUTES = 5;

export type BakeStartTiming =
  | { status: 'upcoming' }
  | { status: 'justNow' }
  | { status: 'past'; minutesAgo: number };

/** Where the chosen mix time sits relative to now. Incomplete choices count as upcoming. */
export function getBakeStartTiming(choice: BakeStartChoice, now = new Date()): BakeStartTiming {
  if (!isBakeStartChoiceValid(choice)) {
    return { status: 'upcoming' };
  }

  const mixTime = parseIsoDate(choice.mixDate);
  mixTime.setMinutes(parseTimeToMinutes(choice.startTime));
  const minutesAgo = Math.floor((now.getTime() - mixTime.getTime()) / 60_000);

  if (minutesAgo < 0) {
    return { status: 'upcoming' };
  }

  return minutesAgo <= PAST_START_GRACE_MINUTES
    ? { status: 'justNow' }
    : { status: 'past', minutesAgo };
}

/** Warning copy for a mix time that is clearly in the past, or null when there is nothing to say. */
export function getBakeStartPastWarning(choice: BakeStartChoice, now = new Date()): string | null {
  const timing = getBakeStartTiming(choice, now);
  if (timing.status !== 'past') {
    return null;
  }

  return `This start time was ${describeTimeAgo(timing.minutesAgo)} ago. Pick a later time, or tap Start now to mix right now.`;
}

/** The current date and clock time, for the "Start now" shortcut. */
export function getStartNowChoice(now = new Date()): BakeStartChoice {
  return { mixDate: getTodayIsoDate(now), startTime: formatClockTime(now) };
}

function describeTimeAgo(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }

  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
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
