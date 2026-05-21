import type { ScheduleInput } from '../schedule/types.ts';
import { getMixDateIso, parseIsoDate } from './dates.ts';
import { parseTimeToMinutes } from './scheduleTiming.ts';

export function getMixDateTime(schedule: ScheduleInput, driftMinutes = 0): Date {
  const mixDate = parseIsoDate(getMixDateIso(schedule));
  const startMinutes = parseTimeToMinutes(schedule.startTime) + driftMinutes;
  const mixStart = startOfDay(mixDate);
  mixStart.setMinutes(mixStart.getMinutes() + startMinutes);
  return mixStart;
}

export function formatOffsetDateTime(
  schedule: ScheduleInput,
  offsetMinutes: number,
  driftMinutes = 0,
): { iso: string; timeLabel: string; dateLabel: string | null } {
  const mixDateTime = getMixDateTime(schedule, driftMinutes);
  const stepDate = new Date(mixDateTime.getTime() + offsetMinutes * 60_000);
  const mixDay = startOfDay(parseIsoDate(getMixDateIso(schedule)));
  const stepDay = startOfDay(stepDate);

  return {
    iso: stepDate.toISOString(),
    timeLabel: formatClockTime(stepDate),
    dateLabel:
      stepDay.getTime() === mixDay.getTime()
        ? null
        : stepDate.toLocaleDateString(undefined, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          }),
  };
}

export function formatClockTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
