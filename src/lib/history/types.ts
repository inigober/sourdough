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
  /** Loaf photo in the private `bake-photos` bucket. Absent on older bakes and signed-out bakes. */
  photoPath?: string;
  steps: BakeHistoryStep[];
};

export type BakeHistorySessionSummary = {
  id: string;
  /** Recipe this bake came from; null or absent when it was deleted or never saved. */
  savedRecipeId?: string | null;
  recipeName: string;
  completedAt: string;
  savedAt: string;
  overallAssessment?: BakeSessionAssessment;
  overallNotePreview?: string;
  /** Loaf photo in the private `bake-photos` bucket. Absent when the bake has no uploaded photo. */
  photoPath?: string;
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
