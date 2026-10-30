import type { ScheduleInput, TimelineStep } from './types.ts';

// "Bake day" is the day the oven goes on. Recipes count days back from it ("Bake day −1") instead of
// storing a calendar date, so the same recipe can be baked on any date.

export type TimelineDayGroup = {
  bakeDayOffset: number;
  label: string;
  steps: TimelineStep[];
};

export function formatBakeDayLabel(bakeDayOffset: number): string {
  if (bakeDayOffset === 0) {
    return 'Bake day';
  }

  // U+2212 minus sign reads better than a hyphen next to words.
  const sign = bakeDayOffset < 0 ? '−' : '+';
  return `Bake day ${sign}${Math.abs(bakeDayOffset)}`;
}

/** Bake-day offset of the step that starts at mix time (offset 0). Null when there are no steps. */
export function getMixDayBakeOffset(steps: TimelineStep[]): number | null {
  const mixStep = steps.find((step) => step.startOffsetMinutes === 0);
  return mixStep ? (mixStep.bakeDayOffset ?? 0) : null;
}

/** Short summary for lists, for example "Mix on bake day −1". */
export function formatMixDaySummary(steps: TimelineStep[]): string {
  const mixDayOffset = getMixDayBakeOffset(steps);
  if (mixDayOffset === null || mixDayOffset === 0) {
    return 'Mix and bake on the same day';
  }

  return `Mix on ${formatBakeDayLabel(mixDayOffset).toLowerCase()}`;
}

export function formatMixAndBakeSentence(mixDayOffset: number): string {
  if (mixDayOffset === 0) {
    return 'Mix and bake on the same day.';
  }

  return `Mix on ${formatBakeDayLabel(mixDayOffset).toLowerCase()} and bake on bake day.`;
}

export function groupStepsByBakeDay(steps: TimelineStep[]): TimelineDayGroup[] {
  const groups: TimelineDayGroup[] = [];

  for (const step of steps) {
    const bakeDayOffset = step.bakeDayOffset ?? 0;
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.bakeDayOffset === bakeDayOffset) {
      lastGroup.steps.push(step);
      continue;
    }

    groups.push({ bakeDayOffset, label: formatBakeDayLabel(bakeDayOffset), steps: [step] });
  }

  return groups;
}

/** Replaces calendar date labels with bake-day labels so the editor and exports stay date-free. */
export function withBakeDayLabels(steps: TimelineStep[]): TimelineStep[] {
  return steps.map((step) => ({ ...step, dateLabel: formatBakeDayLabel(step.bakeDayOffset ?? 0) }));
}

/** Recipes carry no calendar date; drop any date saved by older versions of the app. */
export function withoutCalendarDate(schedule: ScheduleInput): ScheduleInput {
  return { ...schedule, mixDate: '' };
}
