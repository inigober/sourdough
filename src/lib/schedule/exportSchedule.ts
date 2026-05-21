import type { TimelineStep } from './types.ts';

export function formatScheduleAsText(options: {
  recipeName: string;
  mixDateLabel: string;
  bakeDateLabel: string;
  steps: TimelineStep[];
}): string {
  const lines = [
    options.recipeName,
    `Mix: ${options.mixDateLabel}`,
    `Bake: ${options.bakeDateLabel}`,
    '',
    'Bake schedule',
    ...options.steps.map(formatScheduleStepLine),
  ];

  return lines.join('\n');
}

function formatScheduleStepLine(step: TimelineStep): string {
  const timeRange = step.durationMinutes > 0 ? `${step.startTime}–${step.endTime}` : step.startTime;
  const detail = step.detail ? ` — ${step.detail}` : '';

  return `${timeRange}  ${step.label}${detail}`;
}

export function formatRecipeExportJson(options: {
  recipeName: string;
  recipeInput: unknown;
  scheduleInput: unknown;
  timeline: TimelineStep[];
}): string {
  return JSON.stringify(
    {
      name: options.recipeName,
      exportedAt: new Date().toISOString(),
      recipeInput: options.recipeInput,
      scheduleInput: options.scheduleInput,
      timeline: options.timeline,
    },
    null,
    2,
  );
}
