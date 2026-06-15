import type { RecipeInput } from '../recipe/types.ts';
import type { ScheduleInput } from '../schedule/types.ts';

export type BakeSessionAssessment = 'great' | 'ok' | 'needsWork';

export type BakeHistoryStep = {
  id: string;
  stepIndex: number;
  stepKey: string;
  stepLabel: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  actualStartedAt: string;
  actualCompletedAt: string;
};

export type BakeHistorySession = {
  id: string;
  savedRecipeId: string | null;
  recipeName: string;
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  overallNote?: string;
  overallAssessment?: BakeSessionAssessment;
  startedAt: string;
  completedAt: string;
  savedAt: string;
  updatedAt: string;
  steps: BakeHistoryStep[];
};

export type BakeHistorySessionSummary = {
  id: string;
  recipeName: string;
  completedAt: string;
  savedAt: string;
  overallAssessment?: BakeSessionAssessment;
  overallNotePreview?: string;
};

export type UpdateBakeHistorySessionInput = {
  overallNote?: string;
  overallAssessment?: BakeSessionAssessment | null;
};

export type CreateBakeHistorySessionInput = {
  savedRecipeId?: string;
  recipeName: string;
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  overallNote?: string;
  overallAssessment?: BakeSessionAssessment;
  startedAt: string;
  completedAt: string;
  steps: Array<{
    stepIndex: number;
    stepKey: string;
    stepLabel: string;
    plannedStartAt?: string;
    plannedEndAt?: string;
    actualStartedAt: string;
    actualCompletedAt: string;
  }>;
};
