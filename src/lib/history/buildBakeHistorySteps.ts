import { completeTimedStep, recordSkippedStep } from '../companion/liveSchedule.ts';
import type { BakeSession } from '../companion/types.ts';
import { buildTimeline, formatTimelineForDisplay } from '../schedule/buildTimeline.ts';
import { formatOffsetDateTime } from '../schedule/mixDateTime.ts';
import type { TimelineStep } from '../schedule/types.ts';
import type { CreateBakeHistorySessionInput } from './types.ts';

/** Records the current step's actual timings before saving bake history. */
export function finalizeBakeSessionForHistory(
  session: BakeSession,
  timeline: TimelineStep[],
  now = Date.now(),
): BakeSession {
  const currentStep = timeline[session.currentStepIndex];
  if (!currentStep) {
    return session;
  }

  return completeTimedStep(session, currentStep, now);
}

export function buildBakeHistorySteps(
  session: BakeSession,
  timeline: TimelineStep[],
  completedAt: string,
): CreateBakeHistorySessionInput['steps'] {
  const finalized = finalizeBakeSessionForHistory(session, timeline, Date.parse(completedAt));
  const stepLogById = new Map(finalized.stepLogs.map((entry) => [entry.stepId, entry] as const));

  return timeline
    .map((step, index) => {
      const log = stepLogById.get(step.id);
      const plannedStart = formatOffsetDateTime(finalized.scheduleInput, step.startOffsetMinutes, 0).iso;
      const plannedEnd = formatOffsetDateTime(
        finalized.scheduleInput,
        step.startOffsetMinutes + step.durationMinutes,
        0,
      ).iso;

      if (!log && index > finalized.currentStepIndex) {
        return null;
      }

      return {
        stepIndex: index,
        stepKey: step.id,
        stepLabel: step.label,
        plannedStartAt: plannedStart,
        plannedEndAt: plannedEnd,
        actualStartedAt: log?.actualStartedAt ?? completedAt,
        actualCompletedAt: log?.actualCompletedAt ?? completedAt,
      };
    })
    .filter((step): step is NonNullable<typeof step> => step !== null);
}

export function buildBakeHistoryStepsFromSession(
  session: BakeSession,
  completedAt: string,
): CreateBakeHistorySessionInput['steps'] {
  const timeline = formatTimelineForDisplay(buildTimeline(session.scheduleInput, session.recipeInput));
  return buildBakeHistorySteps(session, timeline, completedAt);
}
