import type { ScheduleInput } from '../schedule/types.ts';
import type { TimelineStep } from '../schedule/types.ts';
import { getMixDateIso, parseIsoDate } from '../schedule/dates.ts';
import { formatClockTime, formatOffsetDateTime } from '../schedule/mixDateTime.ts';
import type { BakeSession } from './types.ts';
import { createTimerEndsAt } from './bakeTimer.ts';
import { getEffectiveStepDurationMinutes } from './bakeTimerTestOverride.ts';

function upsertStepLog(
  session: BakeSession,
  step: TimelineStep,
  patch: {
    stepIndex?: number;
    actualStartedAt?: string;
    actualCompletedAt?: string;
  },
): BakeSession['stepLogs'] {
  const existingIndex = session.stepLogs.findIndex((entry) => entry.stepId === step.id);
  const existing = existingIndex >= 0 ? session.stepLogs[existingIndex] : null;
  const nextEntry = {
    stepIndex: patch.stepIndex ?? session.currentStepIndex,
    stepId: step.id,
    stepLabel: step.label,
    actualStartedAt: patch.actualStartedAt ?? existing?.actualStartedAt ?? new Date().toISOString(),
    actualCompletedAt: patch.actualCompletedAt ?? existing?.actualCompletedAt ?? patch.actualStartedAt ?? new Date().toISOString(),
  };

  if (existingIndex < 0) {
    return [...session.stepLogs, nextEntry];
  }

  return session.stepLogs.map((entry, index) => (index === existingIndex ? nextEntry : entry));
}

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

/** Starting a timer earlier than this before its planned start asks the baker first. */
export const EARLY_START_CONFIRM_MINUTES = 30;

/** Whole minutes between "now" and the step's planned start; 0 when due or overdue. */
export function getMinutesUntilStep(
  session: BakeSession,
  step: TimelineStep,
  now = Date.now(),
): number {
  const plannedStartMs = getStepPlannedStartMs(session.scheduleInput, step, session.scheduleDriftMinutes);
  return Math.max(0, Math.ceil((plannedStartMs - now) / 60_000));
}

/** Minutes the step is being started before its planned start; 0 when on time or late. */
export function getEarlyStartMinutes(
  session: BakeSession,
  step: TimelineStep,
  now = Date.now(),
): number {
  const plannedStartMs = getStepPlannedStartMs(session.scheduleInput, step, session.scheduleDriftMinutes);
  return Math.max(0, Math.round((plannedStartMs - now) / 60_000));
}

export function shouldConfirmEarlyStart(
  session: BakeSession,
  step: TimelineStep,
  now = Date.now(),
): boolean {
  return getEarlyStartMinutes(session, step, now) > EARLY_START_CONFIRM_MINUTES;
}

/** "14h 43m", "2h" or "45m". */
export function formatDurationMinutes(totalMinutes: number): string {
  const absolute = Math.abs(Math.round(totalMinutes));
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  return hours > 0 ? `${hours}h` : `${minutes}m`;
}

export function startTimedStep(
  session: BakeSession,
  step: TimelineStep,
  now = Date.now(),
): BakeSession {
  const nowIso = new Date(now).toISOString();
  if (step.durationMinutes <= 0) {
    return {
      ...session,
      currentStepStartedAt: nowIso,
      activeTimerEndsAt: null,
      updatedAt: nowIso,
      stepLogs: upsertStepLog(session, step, {
        actualStartedAt: nowIso,
        actualCompletedAt: nowIso,
      }),
    };
  }

  const plannedStartMs = getStepPlannedStartMs(session.scheduleInput, step, session.scheduleDriftMinutes);
  const startOffsetMinutes = Math.round((now - plannedStartMs) / 60_000);
  // Late starts always push the plan back. Early starts pull it forward only when far
  // enough early that the baker was asked first (EARLY_START_CONFIRM_MINUTES); a few
  // minutes early is noise. Without this, only the running step moved and the rest of
  // the schedule kept its old clock times.
  const planShiftMinutes =
    startOffsetMinutes > 0 || -startOffsetMinutes > EARLY_START_CONFIRM_MINUTES
      ? startOffsetMinutes
      : 0;
  const nextDrift = session.scheduleDriftMinutes + planShiftMinutes;

  return {
    ...session,
    scheduleDriftMinutes: nextDrift,
    currentStepStartedAt: nowIso,
    activeTimerEndsAt: createTimerEndsAt(getEffectiveStepDurationMinutes(step), now),
    updatedAt: nowIso,
    stepLogs: upsertStepLog(session, step, {
      actualStartedAt: nowIso,
    }),
  };
}

export function completeTimedStep(
  session: BakeSession,
  step: TimelineStep,
  now = Date.now(),
): BakeSession {
  const nowIso = new Date(now).toISOString();
  if (step.durationMinutes <= 0 || !session.currentStepStartedAt) {
    return {
      ...session,
      currentStepStartedAt: null,
      activeTimerEndsAt: null,
      updatedAt: nowIso,
      stepLogs: upsertStepLog(session, step, {
        actualStartedAt: session.currentStepStartedAt ?? nowIso,
        actualCompletedAt: nowIso,
      }),
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
    updatedAt: nowIso,
    stepLogs: upsertStepLog(session, step, {
      actualStartedAt: session.currentStepStartedAt,
      actualCompletedAt: nowIso,
    }),
  };
}

export function isTimedStepRunning(session: BakeSession): boolean {
  return Boolean(session.currentStepStartedAt && session.activeTimerEndsAt);
}

export function canStartTimedStep(session: BakeSession, step: TimelineStep): boolean {
  return step.durationMinutes > 0 && !isTimedStepRunning(session);
}

/** Records a step the baker jumped over without running its timer. */
export function recordSkippedStep(
  session: BakeSession,
  step: TimelineStep,
  stepIndex: number,
  now = Date.now(),
): BakeSession {
  const nowIso = new Date(now).toISOString();

  return {
    ...session,
    updatedAt: nowIso,
    stepLogs: upsertStepLog(session, step, {
      stepIndex,
      actualStartedAt: nowIso,
      actualCompletedAt: nowIso,
    }),
  };
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

/**
 * True when the step ends on a later calendar day than it starts, so the screen can say "next day"
 * instead of showing an end time like "01:19" that looks earlier than the start.
 */
export function stepEndsOnLaterDay(session: BakeSession, step: TimelineStep): boolean {
  let startMs: number;
  let endMs: number;

  if (isTimedStepRunning(session) && session.currentStepStartedAt && session.activeTimerEndsAt) {
    startMs = new Date(session.currentStepStartedAt).getTime();
    endMs = new Date(session.activeTimerEndsAt).getTime();
  } else {
    startMs = getStepPlannedStartMs(session.scheduleInput, step, session.scheduleDriftMinutes);
    endMs = startMs + step.durationMinutes * 60_000;
  }

  return startOfDay(new Date(endMs)).getTime() > startOfDay(new Date(startMs)).getTime();
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
