import type { RecipeInput } from '../recipe/types.ts';
import type { ScheduleInput } from '../schedule/types.ts';

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
  coachQuestionsAsked: number;
  startedAt: string;
  updatedAt: string;
};

export type BakeSessionSummary = {
  recipeName: string;
  currentStepIndex: number;
  updatedAt: string;
};
