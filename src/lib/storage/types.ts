import type { BakeRecipeFacts } from '../history/types.ts';
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
  /** Relative timing for list cards, for example "Mix on bake day −1". */
  scheduleLabel: string;
  hasSchedule: boolean;
  /** Hydration, dough size and flour blend for the Saved list's meta line. Optional: see `pickBakeRecipeFacts`. */
  recipeFacts?: BakeRecipeFacts;
  savedAt: string;
  updatedAt: string;
};

export type UpsertSavedRecipeInput = {
  id?: string;
  name: string;
  recipeInput: RecipeInput;
  scheduleInput?: ScheduleInput;
};
