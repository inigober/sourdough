import { buildTimeline, formatTimelineForDisplay } from '../schedule/buildTimeline.ts';
import type { BakeSession, BakeSessionStepLog } from './types.ts';

export const CURRENT_BAKE_SESSION_TIMELINE_VERSION = 2;

/** Normalizes persisted sessions when the companion timeline shape changes. */
export function migrateBakeSession(session: BakeSession): BakeSession {
  let next = session;
  const version = session.timelineVersion ?? 1;

  if (version < CURRENT_BAKE_SESSION_TIMELINE_VERSION) {
    if (version < 2) {
      next = migrateTimelineV1ToV2(next);
    }

    next = {
      ...next,
      timelineVersion: CURRENT_BAKE_SESSION_TIMELINE_VERSION,
    };
  }

  return clampStepIndex(next);
}

function migrateTimelineV1ToV2(session: BakeSession): BakeSession {
  const remappedLogs = remapRestAfterSlapLogs(session.stepLogs);

  if (session.scheduleInput.slapAndFolds <= 0) {
    return {
      ...session,
      stepLogs: remappedLogs,
    };
  }

  const timeline = formatTimelineForDisplay(
    buildTimeline(session.scheduleInput, session.recipeInput),
  );
  const slapIndex = timeline.findIndex((step) => step.id === 'slap-and-fold');

  if (slapIndex < 0) {
    return {
      ...session,
      stepLogs: remappedLogs,
    };
  }

  const oldRestIndex = slapIndex + 1;
  let { currentStepIndex } = session;

  if (currentStepIndex === oldRestIndex) {
    currentStepIndex = slapIndex;
  } else if (currentStepIndex > oldRestIndex) {
    currentStepIndex -= 1;
  }

  return {
    ...session,
    currentStepIndex,
    stepLogs: remappedLogs,
  };
}

function remapRestAfterSlapLogs(stepLogs: BakeSessionStepLog[]): BakeSessionStepLog[] {
  return stepLogs.map((log) =>
    log.stepId === 'rest-after-slap'
      ? {
          ...log,
          stepId: 'slap-and-fold',
          stepLabel: 'Slap and folds',
        }
      : log,
  );
}

function clampStepIndex(session: BakeSession): BakeSession {
  const timeline = formatTimelineForDisplay(
    buildTimeline(session.scheduleInput, session.recipeInput),
  );

  if (timeline.length === 0) {
    return session;
  }

  const maxIndex = timeline.length - 1;
  if (session.currentStepIndex <= maxIndex) {
    return session;
  }

  return {
    ...session,
    currentStepIndex: maxIndex,
  };
}
