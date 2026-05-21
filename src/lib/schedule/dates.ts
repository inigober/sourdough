import type { RecipeInput } from '../recipe/types.ts';
import type { ScheduleInput } from './types.ts';
import { getShapeEndOffset, parseTimeToMinutes } from './scheduleTiming.ts';

export function getTomorrowIsoDate(referenceDate = new Date()): string {
  return formatIsoDate(addDays(referenceDate, 1));
}

export function getTodayIsoDate(referenceDate = new Date()): string {
  return formatIsoDate(referenceDate);
}

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseIsoDate(isoDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    return startOfDay(new Date());
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formatBakeDateShort(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Bake day';
  }

  return `${date.getDate()} ${date.toLocaleDateString(undefined, {
    month: 'short',
  })}`;
}

export function formatBakeDateLong(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Bake day';
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function getMixDateIso(schedule: ScheduleInput): string {
  return schedule.mixDate || getTodayIsoDate();
}

export function getBakeDateIso(schedule: ScheduleInput, recipeInput: RecipeInput): string {
  const mixDate = parseIsoDate(getMixDateIso(schedule));

  if (schedule.proofingStyle === 'cold') {
    return formatIsoDate(addDays(mixDate, 1));
  }

  const startMinutes = parseTimeToMinutes(schedule.startTime);
  const bakeOffsetMinutes = getShapeEndOffset(schedule, recipeInput) + schedule.roomProofHours * 60;
  const bakeDate = addMinutesFromMidnight(mixDate, startMinutes + bakeOffsetMinutes);

  return formatIsoDate(bakeDate);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMinutesFromMidnight(mixDate: Date, minutesFromMixDayStart: number): Date {
  const next = startOfDay(mixDate);
  next.setMinutes(next.getMinutes() + minutesFromMixDayStart);
  return next;
}
