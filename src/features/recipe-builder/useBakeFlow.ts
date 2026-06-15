import { useCallback } from 'react';

import type { BakeCompleteSaveInput } from '../../lib/companion/types.ts';
import { generateDefaultRecipeName } from '../../lib/storage/recipeStorage.ts';
import type { SavedRecipe } from '../../lib/storage/types.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import type { RecipeInput } from '../../lib/recipe/types.ts';

type BeginBakeSessionOptions = {
  savedRecipeId: string | null;
  recipeName: string;
  recipe: RecipeInput;
  schedule: ScheduleInput;
};

type BakeSessionActions = {
  beginBakeSession: (options: BeginBakeSessionOptions) => void;
  resumeBakeSession: () => void;
  runStartBake: (start: () => Promise<void>) => Promise<void>;
  saveCompletedBakeToHistory: (input: BakeCompleteSaveInput) => Promise<boolean>;
  clearSessionAfterFinish: () => void;
  stashSessionOnLeaveCompanion: () => void;
};

type UseBakeFlowOptions = {
  activeSavedRecipeId: string | null;
  activeSavedRecipe: SavedRecipe | null;
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  fetchSavedRecipe: (id: string) => Promise<SavedRecipe | null>;
  saveActiveRecipe: (name: string, includeSchedule: boolean) => Promise<SavedRecipe>;
  enterCompanion: () => void;
  performGoHome: () => void;
  openSaveDialog: (source: 'schedule') => void;
  setPendingStartBakeAfterSave: (pending: boolean) => void;
  bakeSession: BakeSessionActions;
};

export function useBakeFlow({
  activeSavedRecipeId,
  activeSavedRecipe,
  recipeInput,
  scheduleInput,
  fetchSavedRecipe,
  saveActiveRecipe,
  enterCompanion,
  performGoHome,
  openSaveDialog,
  setPendingStartBakeAfterSave,
  bakeSession,
}: UseBakeFlowOptions) {
  const enterCompanionBake = useCallback(
    (options: BeginBakeSessionOptions): void => {
      bakeSession.beginBakeSession(options);
      enterCompanion();
    },
    [bakeSession, enterCompanion],
  );

  const ensureRecipeSaved = useCallback(async (): Promise<SavedRecipe> => {
    return saveActiveRecipe(
      activeSavedRecipe?.name ?? generateDefaultRecipeName(recipeInput, scheduleInput),
      true,
    );
  }, [activeSavedRecipe?.name, recipeInput, saveActiveRecipe, scheduleInput]);

  const proceedWithStartBake = useCallback(async (): Promise<void> => {
    await bakeSession.runStartBake(async () => {
      const saved = await ensureRecipeSaved();
      enterCompanionBake({
        savedRecipeId: saved.id,
        recipeName: saved.name,
        recipe: saved.recipeInput,
        schedule: saved.scheduleInput ?? scheduleInput,
      });
    });
  }, [bakeSession, ensureRecipeSaved, enterCompanionBake, scheduleInput]);

  const handleResumeBake = useCallback((): void => {
    bakeSession.resumeBakeSession();
    enterCompanion();
  }, [bakeSession, enterCompanion]);

  const startBakeFromSchedule = useCallback(async (): Promise<void> => {
    if (!activeSavedRecipeId) {
      setPendingStartBakeAfterSave(true);
      openSaveDialog('schedule');
      return;
    }

    await proceedWithStartBake();
  }, [activeSavedRecipeId, openSaveDialog, proceedWithStartBake, setPendingStartBakeAfterSave]);

  const startBakeFromSavedRecipe = useCallback(
    async (id: string): Promise<void> => {
      const saved = await fetchSavedRecipe(id);
      if (!saved?.scheduleInput) {
        return;
      }

      enterCompanionBake({
        savedRecipeId: saved.id,
        recipeName: saved.name,
        recipe: saved.recipeInput,
        schedule: saved.scheduleInput,
      });
    },
    [enterCompanionBake, fetchSavedRecipe],
  );

  const saveCompletedBake = useCallback(
    async (input: BakeCompleteSaveInput): Promise<void> => {
      const saved = await bakeSession.saveCompletedBakeToHistory(input);
      if (saved) {
        performGoHome();
      }
    },
    [bakeSession, performGoHome],
  );

  const exitCompanion = useCallback(
    (options: { finished: boolean }): void => {
      if (options.finished) {
        bakeSession.clearSessionAfterFinish();
      } else {
        bakeSession.stashSessionOnLeaveCompanion();
      }

      performGoHome();
    },
    [bakeSession, performGoHome],
  );

  const continueAfterSaveRecipe = useCallback(
    async (options: { pendingGoHomeAfterSave: boolean; pendingStartBakeAfterSave: boolean }): Promise<void> => {
      if (options.pendingGoHomeAfterSave) {
        performGoHome();
        return;
      }

      if (options.pendingStartBakeAfterSave) {
        setPendingStartBakeAfterSave(false);
        await proceedWithStartBake();
      }
    },
    [performGoHome, proceedWithStartBake, setPendingStartBakeAfterSave],
  );

  return {
    handleResumeBake,
    startBakeFromSchedule,
    startBakeFromSavedRecipe,
    saveCompletedBake,
    exitCompanion,
    continueAfterSaveRecipe,
  };
}
