import type { RecipeInput } from '../recipe/types.ts';
import type { ScheduleInput } from '../schedule/types.ts';

export type SavedRecipe = {
  id: string;
  name: string;
  recipeInput: RecipeInput;
  scheduleInput?: ScheduleInput;
  savedAt: string;
  updatedAt: string;
};

export type SavedRecipeSummary = {
  id: string;
  name: string;
  breadStyle: string;
  bakeDateLabel: string;
  hasSchedule: boolean;
  savedAt: string;
  updatedAt: string;
};

export type UpsertSavedRecipeInput = {
  id?: string;
  name: string;
  recipeInput: RecipeInput;
  scheduleInput?: ScheduleInput;
};
