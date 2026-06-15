import type { BakeSessionAssessment } from '../history/types.ts';
import type { RecipeInput } from '../recipe/types.ts';
import type { ScheduleInput } from '../schedule/types.ts';

export type BakeCompleteSaveInput = {
  note: string;
  assessment?: BakeSessionAssessment;
};

export type BakeSessionStepLog = {
  stepIndex: number;
  stepId: string;
  stepLabel: string;
  actualStartedAt: string;
  actualCompletedAt: string;
};

export type BakeSession = {
  id: string;
  savedRecipeId: string | null;
  recipeName: string;
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  currentStepIndex: number;
  scheduleDriftMinutes: number;
  currentStepStartedAt: string | null;
  activeTimerEndsAt: string | null;
  stepLogs: BakeSessionStepLog[];
  coachQuestionsAsked: number;
  startedAt: string;
  updatedAt: string;
};

export type BakeSessionSummary = {
  recipeName: string;
  currentStepIndex: number;
  updatedAt: string;
};
