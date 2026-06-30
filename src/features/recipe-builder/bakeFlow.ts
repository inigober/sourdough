import { generateDefaultRecipeName } from '../../lib/storage/recipeStorage.ts';
import type { SavedRecipe } from '../../lib/storage/types.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import type { RecipeInput } from '../../lib/recipe/types.ts';

/** Bake requires a saved recipe id; prompt when unsaved or when a saved recipe has unsaved edits. */
export function shouldPromptSaveBeforeBake(
  activeSavedRecipeId: string | null,
  isDirty = false,
): boolean {
  return !activeSavedRecipeId || isDirty;
}

export function canStartBakeFromSavedRecipe(
  saved: SavedRecipe | null | undefined,
): saved is SavedRecipe & { scheduleInput: ScheduleInput } {
  return Boolean(saved?.scheduleInput);
}

export function resolveRecipeSaveName(
  activeSavedRecipe: SavedRecipe | null,
  recipeInput: RecipeInput,
  scheduleInput: ScheduleInput,
): string {
  return activeSavedRecipe?.name ?? generateDefaultRecipeName(recipeInput, scheduleInput);
}

export type CompanionExitSessionAction = 'clear' | 'stash';

export function getCompanionExitSessionAction(finished: boolean): CompanionExitSessionAction {
  return finished ? 'clear' : 'stash';
}

export type PostSaveBakeFlowAction = 'goHome' | 'startBake' | 'none';

export function resolvePostSaveBakeFlowAction(options: {
  pendingGoHomeAfterSave: boolean;
  pendingStartBakeAfterSave: boolean;
}): PostSaveBakeFlowAction {
  if (options.pendingGoHomeAfterSave) {
    return 'goHome';
  }

  if (options.pendingStartBakeAfterSave) {
    return 'startBake';
  }

  return 'none';
}
