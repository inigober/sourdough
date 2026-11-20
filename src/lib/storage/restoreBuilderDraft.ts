import type { RecipeInput } from '../recipe/types.ts';
import { normalizeScheduleInput } from '../schedule/normalizeScheduleInput.ts';
import { withoutCalendarDate } from '../schedule/relativeDays.ts';
import type { ScheduleInput } from '../schedule/types.ts';
import type { BuilderDraft } from './draftStorage.ts';
import type { SavedRecipe } from './types.ts';

export type DraftRestoreDecision =
  /** Do not restore, and do not ask again for this page load. */
  | { action: 'skip' }
  /** Not ready yet (sign-in still settling). Ask again when the inputs change. */
  | { action: 'wait' }
  | { action: 'restore'; draft: BuilderDraft };

/**
 * Decides whether a page load should put the stored builder draft back into memory.
 *
 * This is only for a load that lands directly on a builder page (/build/flour, /build/summary, ...), such as a
 * browser refresh. A load on Home or any other page keeps its "Continue where you left off" card instead.
 * The URL always wins over the draft's saved step: the caller restores the content and keeps the page.
 */
export function decideBuilderDraftRestore(input: {
  /** The page was first loaded on a builder route (not Home, Saved, History, a recipe, or bake mode). */
  startedOnBuilderRoute: boolean;
  /** The builder still holds exactly its starting state (see isUntouchedBuilderState). */
  isBuilderUntouched: boolean;
  isAuthLoading: boolean;
  draft: BuilderDraft | null;
}): DraftRestoreDecision {
  const { startedOnBuilderRoute, isBuilderUntouched, isAuthLoading, draft } = input;

  if (!startedOnBuilderRoute || !isBuilderUntouched || !draft) {
    return { action: 'skip' };
  }

  // A draft linked to a saved recipe needs that recipe looked up, and which store to ask (this device or the
  // cloud) is only known once sign-in has settled. An unlinked draft has nothing to look up.
  if (draft.activeSavedRecipeId && isAuthLoading) {
    return { action: 'wait' };
  }

  return { action: 'restore', draft };
}

export type RestoredBuilderState = {
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  activeSavedRecipeId: string | null;
  activeSavedRecipe: SavedRecipe | null;
  hasCompletedWizard: boolean;
  editingFromResults: boolean;
  hasOpenedSchedule: boolean;
};

/**
 * What to put into the builder for a stored draft.
 * `savedRecipe` is the draft's linked saved recipe as found in storage, or null when it could not be found
 * (deleted, or not reachable). Then only the link is dropped and the baker's work is kept; the recipe will be
 * saved as a new one instead of overwriting something that is gone.
 */
export function resolveRestoredDraftState(
  draft: BuilderDraft,
  savedRecipe: SavedRecipe | null,
): RestoredBuilderState {
  return {
    recipeInput: draft.recipeInput,
    // Drafts written by older versions may miss newer schedule fields. Recipes have no calendar date.
    scheduleInput: withoutCalendarDate(normalizeScheduleInput(draft.scheduleInput, draft.recipeInput)),
    activeSavedRecipeId: savedRecipe ? draft.activeSavedRecipeId : null,
    activeSavedRecipe: savedRecipe,
    hasCompletedWizard: draft.hasCompletedWizard,
    editingFromResults: draft.editingFromResults,
    hasOpenedSchedule: draft.hasOpenedSchedule,
  };
}
