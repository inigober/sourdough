import { useCallback, useState } from 'react';

import type { BakeCompleteSaveInput } from '../../lib/companion/types.ts';
import type { SavedRecipe } from '../../lib/storage/types.ts';
import { applyBakeStart, type BakeStartChoice } from '../../lib/schedule/bakeStart.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import type { RecipeInput } from '../../lib/recipe/types.ts';
import {
  canStartBakeFromSavedRecipe,
  getCompanionExitSessionAction,
  resolvePostSaveBakeFlowAction,
  resolveRecipeSaveName,
  shouldPromptSaveBeforeBake,
} from './bakeFlow.ts';

type BeginBakeSessionOptions = {
  savedRecipeId: string | null;
  recipeName: string;
  recipe: RecipeInput;
  schedule: ScheduleInput;
};

/**
 * A bake waiting for its real mix date and time. `savedRecipe` is set when the bake starts straight
 * from a saved recipe; otherwise it starts from the recipe open in the builder (saved on confirm).
 */
type BakeStartRequest = {
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  savedRecipe: (SavedRecipe & { scheduleInput: ScheduleInput }) | null;
};

type BakeSessionActions = {
  tryBeginBakeSession: (options: BeginBakeSessionOptions) => boolean;
  confirmPendingBeginBakeSession: () => void;
  resumeBakeSession: () => void;
  runStartBake: (start: () => Promise<void>) => Promise<void>;
  saveCompletedBakeToHistory: (input: BakeCompleteSaveInput) => Promise<boolean>;
  clearSessionAfterFinish: () => void;
  stashSessionOnLeaveCompanion: () => void;
};

type UseBakeFlowOptions = {
  activeSavedRecipeId: string | null;
  activeSavedRecipe: SavedRecipe | null;
  isDirty: boolean;
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
  isDirty,
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
  const [bakeStartRequest, setBakeStartRequest] = useState<BakeStartRequest | null>(null);

  const enterCompanionBake = useCallback(
    (options: BeginBakeSessionOptions): boolean => {
      const started = bakeSession.tryBeginBakeSession(options);
      if (started) {
        enterCompanion();
      }
      return started;
    },
    [bakeSession, enterCompanion],
  );

  const ensureRecipeSaved = useCallback(async (): Promise<SavedRecipe> => {
    return saveActiveRecipe(resolveRecipeSaveName(activeSavedRecipe, recipeInput, scheduleInput), true);
  }, [activeSavedRecipe, recipeInput, saveActiveRecipe, scheduleInput]);

  // The saved recipe keeps relative days only; the chosen date and time live on the bake session.
  const proceedWithStartBake = useCallback(
    async (choice: BakeStartChoice): Promise<void> => {
      await bakeSession.runStartBake(async () => {
        const saved = await ensureRecipeSaved();
        enterCompanionBake({
          savedRecipeId: saved.id,
          recipeName: saved.name,
          recipe: saved.recipeInput,
          schedule: applyBakeStart(saved.scheduleInput ?? scheduleInput, choice),
        });
      });
    },
    [bakeSession, ensureRecipeSaved, enterCompanionBake, scheduleInput],
  );

  const requestBakeStartFromBuilder = useCallback((): void => {
    setBakeStartRequest({ recipeInput, scheduleInput, savedRecipe: null });
  }, [recipeInput, scheduleInput]);

  const requestBakeStartForSavedRecipe = useCallback(
    (saved: SavedRecipe & { scheduleInput: ScheduleInput }): void => {
      setBakeStartRequest({
        recipeInput: saved.recipeInput,
        scheduleInput: saved.scheduleInput,
        savedRecipe: saved,
      });
    },
    [],
  );

  const cancelBakeStart = useCallback((): void => {
    setBakeStartRequest(null);
  }, []);

  const confirmBakeStart = useCallback(
    async (choice: BakeStartChoice): Promise<void> => {
      const request = bakeStartRequest;
      if (!request) {
        return;
      }

      setBakeStartRequest(null);

      if (request.savedRecipe) {
        enterCompanionBake({
          savedRecipeId: request.savedRecipe.id,
          recipeName: request.savedRecipe.name,
          recipe: request.savedRecipe.recipeInput,
          schedule: applyBakeStart(request.savedRecipe.scheduleInput, choice),
        });
        return;
      }

      await proceedWithStartBake(choice);
    },
    [bakeStartRequest, enterCompanionBake, proceedWithStartBake],
  );

  const handleResumeBake = useCallback((): void => {
    bakeSession.resumeBakeSession();
    enterCompanion();
  }, [bakeSession, enterCompanion]);

  const startBakeFromSchedule = useCallback(async (): Promise<void> => {
    if (shouldPromptSaveBeforeBake(activeSavedRecipeId, isDirty)) {
      setPendingStartBakeAfterSave(true);
      openSaveDialog('schedule');
      return;
    }

    requestBakeStartFromBuilder();
  }, [activeSavedRecipeId, isDirty, openSaveDialog, requestBakeStartFromBuilder, setPendingStartBakeAfterSave]);

  const startBakeFromSavedRecipe = useCallback(
    async (id: string): Promise<void> => {
      const saved = await fetchSavedRecipe(id);
      if (!canStartBakeFromSavedRecipe(saved)) {
        return;
      }

      requestBakeStartForSavedRecipe(saved);
    },
    [fetchSavedRecipe, requestBakeStartForSavedRecipe],
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
      if (getCompanionExitSessionAction(options.finished) === 'clear') {
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
      const action = resolvePostSaveBakeFlowAction(options);

      if (action === 'goHome') {
        performGoHome();
        return;
      }

      if (action === 'startBake') {
        setPendingStartBakeAfterSave(false);
        requestBakeStartFromBuilder();
      }
    },
    [performGoHome, requestBakeStartFromBuilder, setPendingStartBakeAfterSave],
  );

  return {
    bakeStartRequest,
    cancelBakeStart,
    confirmBakeStart,
    requestBakeStartForSavedRecipe,
    handleResumeBake,
    startBakeFromSchedule,
    startBakeFromSavedRecipe,
    saveCompletedBake,
    exitCompanion,
    continueAfterSaveRecipe,
  };
}
