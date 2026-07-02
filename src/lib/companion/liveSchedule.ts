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
  const lateStartMinutes = Math.max(0, Math.round((now - plannedStartMs) / 60_000));
  const nextDrift = session.scheduleDriftMinutes + lateStartMinutes;

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
