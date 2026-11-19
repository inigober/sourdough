import type { RecipeInput } from '../recipe/types.ts';
import { normalizeScheduleInput } from '../schedule/normalizeScheduleInput.ts';
import type { ScheduleInput } from '../schedule/types.ts';
import type { BakeHistorySession } from './types.ts';

export type BakeAgainStart = {
  /** Null when the recipe was deleted since; a new bake must not link to a recipe that is gone. */
  savedRecipeId: string | null;
  recipeName: string;
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
};

/**
 * What "Bake again" starts from: the recipe and schedule exactly as that bake was done (the
 * history snapshot), not the saved recipe as it is today. The real mix date is picked afresh in
 * the bake start dialog.
 */
export function buildBakeAgainStart(
  session: BakeHistorySession,
  savedRecipeStillExists: boolean,
): BakeAgainStart {
  return {
    savedRecipeId: savedRecipeStillExists ? session.savedRecipeId : null,
    recipeName: session.recipeName,
    recipeInput: session.recipeInput,
    scheduleInput: normalizeScheduleInput(session.scheduleInput, session.recipeInput),
  };
}
