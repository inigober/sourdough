import type { RecipeInput } from '../recipe/types.ts';
import type { ScheduleInput } from './types.ts';

export function parseTimeToMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) {
    return 9 * 60;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function getBulkStartOffset(schedule: ScheduleInput): number {
  let offset = 0;

  if (schedule.autolyseEnabled) {
    offset += schedule.autolyseMinutes;
  }

  return offset;
}

export function getShapeEndOffset(schedule: ScheduleInput, recipeInput: RecipeInput): number {
  return getBulkStartOffset(schedule) + Math.round(recipeInput.targetBulkHours * 60);
}

export function roundColdRetardHoursUp(coldRetardHours: number): number {
  return Math.ceil(coldRetardHours);
}

export function getColdRetardHours(schedule: ScheduleInput, recipeInput: RecipeInput): number {
  const shapeEndOffset = getShapeEndOffset(schedule, recipeInput);
  const startMinutes = parseTimeToMinutes(schedule.startTime);
  const shapeEndMinutesOfDay = (startMinutes + shapeEndOffset) % (24 * 60);
  const desiredBakeMinutes = parseTimeToMinutes(schedule.desiredBakeTime);
  const coldRetardMinutes = 24 * 60 - shapeEndMinutesOfDay + desiredBakeMinutes;

  return coldRetardMinutes / 60;
}
