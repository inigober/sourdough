import type { ScheduleInput } from '../schedule/types.ts';
import type { TimelineStep } from '../schedule/types.ts';
import { createTimerEndsAt } from './bakeTimer.ts';
import { getEffectiveStepDurationMinutes } from './bakeTimerTestOverride.ts';
import { completeTimedStep, recordSkippedStep, startTimedStep } from './liveSchedule.ts';
import { CURRENT_BAKE_SESSION_TIMELINE_VERSION } from './migrateBakeSession.ts';
import type { BakeSession } from './types.ts';

export function createBakeSession(options: {
  savedRecipeId: string | null;
  recipeName: string;
  recipeInput: import('../recipe/types.ts').RecipeInput;
  scheduleInput: ScheduleInput;
}): BakeSession {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    savedRecipeId: options.savedRecipeId,
    recipeName: options.recipeName,
    recipeInput: structuredClone(options.recipeInput),
    scheduleInput: structuredClone(options.scheduleInput),
    timelineVersion: CURRENT_BAKE_SESSION_TIMELINE_VERSION,
    currentStepIndex: 0,
    scheduleDriftMinutes: 0,
    currentStepStartedAt: null,
    activeTimerEndsAt: null,
    stepLogs: [],
    coachQuestionsAsked: 0,
    startedAt: now,
    updatedAt: now,
  };
}

export function incrementCoachQuestionsAsked(session: BakeSession): BakeSession {
  const now = new Date().toISOString();

  return {
    ...session,
    coachQuestionsAsked: session.coachQuestionsAsked + 1,
    updatedAt: now,
  };
}

export function getCurrentTimelineStep(
  steps: TimelineStep[],
  session: BakeSession,
): TimelineStep | null {
  return steps[session.currentStepIndex] ?? null;
}

export function getNextTimelineStep(
  steps: TimelineStep[],
  session: BakeSession,
): TimelineStep | null {
  return steps[session.currentStepIndex + 1] ?? null;
}

export function getPreviousTimelineStep(
  steps: TimelineStep[],
  session: BakeSession,
): TimelineStep | null {
  if (session.currentStepIndex <= 0) {
    return null;
  }

  return steps[session.currentStepIndex - 1] ?? null;
}

export function advanceBakeSession(
  session: BakeSession,
  stepCount: number,
  currentStep: TimelineStep | null,
): BakeSession {
  const completed = currentStep ? completeTimedStep(session, currentStep) : session;
  const nextIndex = Math.min(completed.currentStepIndex + 1, Math.max(stepCount - 1, 0));
  const now = new Date().toISOString();

  return {
    ...completed,
    currentStepIndex: nextIndex,
    updatedAt: now,
    currentStepStartedAt: null,
    activeTimerEndsAt: null,
  };
}

export function retreatBakeSession(session: BakeSession): BakeSession {
  const nextIndex = Math.max(session.currentStepIndex - 1, 0);
  const now = new Date().toISOString();

  return {
    ...session,
    currentStepIndex: nextIndex,
    updatedAt: now,
    currentStepStartedAt: null,
    activeTimerEndsAt: null,
  };
}

export function jumpToBakeStep(
  session: BakeSession,
  index: number,
  timeline: TimelineStep[],
  now = Date.now(),
): BakeSession {
  const nowIso = new Date(now).toISOString();
  const clampedIndex = Math.max(0, Math.min(index, Math.max(timeline.length - 1, 0)));
  let next = session;

  if (clampedIndex > session.currentStepIndex) {
    for (let stepIndex = session.currentStepIndex; stepIndex < clampedIndex; stepIndex += 1) {
      const step = timeline[stepIndex];
      if (!step || next.stepLogs.some((entry) => entry.stepId === step.id)) {
        continue;
      }

      if (stepIndex === session.currentStepIndex) {
        next = completeTimedStep(next, step, now);
      } else {
        next = recordSkippedStep(next, step, stepIndex, now);
      }
    }
  }

  return {
    ...next,
    currentStepIndex: clampedIndex,
    updatedAt: nowIso,
    currentStepStartedAt: null,
    activeTimerEndsAt: null,
  };
}

export function updateBakeSessionSchedule(
  session: BakeSession,
  scheduleInput: ScheduleInput,
): BakeSession {
  const now = new Date().toISOString();

  return {
    ...session,
    scheduleInput: structuredClone(scheduleInput),
    updatedAt: now,
    currentStepStartedAt: null,
    activeTimerEndsAt: null,
  };
}

export function toBakeSessionSummary(session: BakeSession) {
  return {
    recipeName: session.recipeName,
    currentStepIndex: session.currentStepIndex,
    updatedAt: session.updatedAt,
  };
}

export function isBakeSessionComplete(session: BakeSession, stepCount: number): boolean {
  return stepCount > 0 && session.currentStepIndex >= stepCount - 1;
}

export function restartStepTimer(
  session: BakeSession,
  step: TimelineStep,
  now = Date.now(),
): BakeSession {
  if (step.durationMinutes <= 0) {
    return session;
  }

  return {
    ...session,
    currentStepStartedAt: new Date(now).toISOString(),
    activeTimerEndsAt: createTimerEndsAt(getEffectiveStepDurationMinutes(step), now),
    updatedAt: new Date(now).toISOString(),
  };
}

export { startTimedStep };
