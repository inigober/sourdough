import { formatClockTime } from '../schedule/mixDateTime.ts';
import type { TimelineStep } from '../schedule/types.ts';
import { getStepPlannedStartMs } from './liveSchedule.ts';
import type { BakeSession } from './types.ts';

/** What is happening in this bake right now, as facts the coach prompt can quote. */
export type CoachLiveContext = {
  stepNumber: number;
  totalSteps: number;
  /** Start time of the current step in the original plan (before any drift), ISO. */
  plannedStepStartIso: string;
  /** Positive = running behind the original plan, negative = ahead. */
  scheduleDriftMinutes: number;
  /** When the baker pressed start on this step, or null if the timer has not run. */
  stepStartedAtIso: string | null;
  stepDurationMinutes: number;
  /** Labels of steps logged before the current one, in the order they were logged. */
  loggedStepLabels: string[];
  nowIso: string;
};

/**
 * `timeline` must be the plan WITHOUT drift applied (`formatTimelineForDisplay(buildTimeline(...))`),
 * so "planned" really means the original plan; drift is reported separately.
 */
export function buildCoachLiveContext(
  session: BakeSession,
  timeline: TimelineStep[],
  now = Date.now(),
): CoachLiveContext | null {
  const step = timeline[session.currentStepIndex];
  if (!step) {
    return null;
  }

  return {
    stepNumber: session.currentStepIndex + 1,
    totalSteps: timeline.length,
    plannedStepStartIso: new Date(getStepPlannedStartMs(session.scheduleInput, step, 0)).toISOString(),
    scheduleDriftMinutes: session.scheduleDriftMinutes,
    stepStartedAtIso: session.currentStepStartedAt,
    stepDurationMinutes: step.durationMinutes,
    loggedStepLabels: session.stepLogs
      .filter((log) => log.stepId !== step.id)
      .map((log) => log.stepLabel),
    nowIso: new Date(now).toISOString(),
  };
}

export function formatCoachLiveContextLines(live: CoachLiveContext): string[] {
  const now = new Date(live.nowIso);
  const lines = [
    `Progress: step ${live.stepNumber} of ${live.totalSteps}`,
    `Time now: ${formatClockTime(now)}`,
    `Planned start of this step (original plan): ${formatClockTime(new Date(live.plannedStepStartIso))}`,
  ];

  if (live.stepStartedAtIso) {
    const startedAt = new Date(live.stepStartedAtIso);
    const minutesIn = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 60_000));
    lines.push(
      `Actual start of this step: ${formatClockTime(startedAt)} (${minutesIn} min ago), planned length ${live.stepDurationMinutes} min`,
    );
  } else {
    lines.push('This step has not been started yet (no timer running)');
  }

  lines.push(`Schedule so far: ${describeDrift(live.scheduleDriftMinutes)}`);
  lines.push(
    live.loggedStepLabels.length > 0
      ? `Steps already logged: ${live.loggedStepLabels.join(', ')}`
      : 'Steps already logged: none yet',
  );

  return lines;
}

function describeDrift(driftMinutes: number): string {
  const rounded = Math.round(driftMinutes);
  if (rounded === 0) {
    return 'on the original plan';
  }

  return rounded > 0
    ? `running ${rounded} min behind the original plan`
    : `running ${Math.abs(rounded)} min ahead of the original plan`;
}
