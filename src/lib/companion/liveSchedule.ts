import type { ScheduleInput } from '../schedule/types.ts';
import type { TimelineStep } from '../schedule/types.ts';
import { getMixDateIso, parseIsoDate } from '../schedule/dates.ts';
import { formatClockTime, formatOffsetDateTime } from '../schedule/mixDateTime.ts';
import type { BakeSession } from './types.ts';
import { createTimerEndsAt } from './bakeTimer.ts';

export function applyScheduleDriftToTimeline(
  schedule: ScheduleInput,
  steps: TimelineStep[],
  driftMinutes: number,
): TimelineStep[] {
  if (driftMinutes === 0) {
    return steps;
  }

  return steps.map((step) => {
    const start = formatOffsetDateTime(schedule, step.startOffsetMinutes, driftMinutes);
    const end = formatOffsetDateTime(
      schedule,
      step.startOffsetMinutes + step.durationMinutes,
      driftMinutes,
    );

    return {
      ...step,
      startTime: start.timeLabel,
      endTime: end.timeLabel,
      dateLabel: start.dateLabel ?? end.dateLabel ?? step.dateLabel,
    };
  });
}

export function getStepPlannedStartMs(
  schedule: ScheduleInput,
  step: TimelineStep,
  driftMinutes: number,
): number {
  const start = formatOffsetDateTime(schedule, step.startOffsetMinutes, driftMinutes);
  return new Date(start.iso).getTime();
}

export function startTimedStep(
  session: BakeSession,
  step: TimelineStep,
  now = Date.now(),
): BakeSession {
  if (step.durationMinutes <= 0) {
    return {
      ...session,
      currentStepStartedAt: new Date(now).toISOString(),
      activeTimerEndsAt: null,
      updatedAt: new Date(now).toISOString(),
    };
  }

  const plannedStartMs = getStepPlannedStartMs(session.scheduleInput, step, session.scheduleDriftMinutes);
  const lateStartMinutes = Math.max(0, Math.round((now - plannedStartMs) / 60_000));
  const nextDrift = session.scheduleDriftMinutes + lateStartMinutes;

  return {
    ...session,
    scheduleDriftMinutes: nextDrift,
    currentStepStartedAt: new Date(now).toISOString(),
    activeTimerEndsAt: createTimerEndsAt(step.durationMinutes, now),
    updatedAt: new Date(now).toISOString(),
  };
}

export function completeTimedStep(
  session: BakeSession,
  step: TimelineStep,
  now = Date.now(),
): BakeSession {
  if (step.durationMinutes <= 0 || !session.currentStepStartedAt) {
    return {
      ...session,
      currentStepStartedAt: null,
      activeTimerEndsAt: null,
      updatedAt: new Date(now).toISOString(),
    };
  }

  const startedMs = new Date(session.currentStepStartedAt).getTime();
  const plannedEndMs = startedMs + step.durationMinutes * 60_000;
  const completionDriftMinutes = Math.round((now - plannedEndMs) / 60_000);

  return {
    ...session,
    scheduleDriftMinutes: session.scheduleDriftMinutes + completionDriftMinutes,
    currentStepStartedAt: null,
    activeTimerEndsAt: null,
    updatedAt: new Date(now).toISOString(),
  };
}

export function isTimedStepRunning(session: BakeSession): boolean {
  return Boolean(session.currentStepStartedAt && session.activeTimerEndsAt);
}

export function canStartTimedStep(session: BakeSession, step: TimelineStep): boolean {
  return step.durationMinutes > 0 && !isTimedStepRunning(session);
}

export function getDisplayStepTimes(
  session: BakeSession,
  step: TimelineStep,
): Pick<TimelineStep, 'startTime' | 'endTime' | 'dateLabel'> {
  if (
    isTimedStepRunning(session) &&
    session.currentStepStartedAt &&
    session.activeTimerEndsAt
  ) {
    const startDate = new Date(session.currentStepStartedAt);
    const endDate = new Date(session.activeTimerEndsAt);

    return {
      startTime: formatClockTime(startDate),
      endTime: formatClockTime(endDate),
      dateLabel: formatDateLabelIfNotMixDay(session.scheduleInput, startDate),
    };
  }

  return {
    startTime: step.startTime,
    endTime: step.endTime,
    dateLabel: step.dateLabel,
  };
}

function formatDateLabelIfNotMixDay(schedule: ScheduleInput, date: Date): string | undefined {
  const mixDay = startOfDay(parseIsoDate(getMixDateIso(schedule)));
  const stepDay = startOfDay(date);

  if (stepDay.getTime() === mixDay.getTime()) {
    return undefined;
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
