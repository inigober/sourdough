import type { ScheduleInput } from '../schedule/types.ts';
import type { TimelineStep } from '../schedule/types.ts';
import { createTimerEndsAt } from './bakeTimer.ts';
import { completeTimedStep, startTimedStep } from './liveSchedule.ts';
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
    currentStepIndex: 0,
    scheduleDriftMinutes: 0,
    currentStepStartedAt: null,
    activeTimerEndsAt: null,
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

export function jumpToBakeStep(session: BakeSession, index: number): BakeSession {
  const now = new Date().toISOString();

  return {
    ...session,
    currentStepIndex: index,
    updatedAt: now,
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

export function restartStepTimer(session: BakeSession, step: TimelineStep): BakeSession {
  if (step.durationMinutes <= 0) {
    return session;
  }

  const now = Date.now();
  return {
    ...session,
    currentStepStartedAt: new Date(now).toISOString(),
    activeTimerEndsAt: createTimerEndsAt(step.durationMinutes, now),
    updatedAt: new Date(now).toISOString(),
  };
}

export { startTimedStep };
