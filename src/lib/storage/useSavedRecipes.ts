import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import type { RecipeInput } from '../recipe/types.ts';
import type { ScheduleInput } from '../schedule/types.ts';
import { importLocalRecipesIfNeeded } from './importLocalRecipes.ts';
import {
  deleteSavedRecipe,
  duplicateSavedRecipe,
  getSavedRecipe,
  listSavedRecipeSummaries,
  upsertSavedRecipe,
} from './recipeStorage.ts';
import {
  deleteRemoteSavedRecipe,
  duplicateRemoteSavedRecipe,
  getRemoteSavedRecipe,
  listRemoteRecipeSummaries,
  upsertRemoteSavedRecipe,
} from './remoteRecipeStorage.ts';
import type { SavedRecipe, SavedRecipeSummary } from './types.ts';

type UseSavedRecipesOptions = {
  user: User | null;
  isConfigured: boolean;
};

export function useSavedRecipes({ user, isConfigured }: UseSavedRecipesOptions) {
  const useCloudRecipes = Boolean(user && isConfigured);

  const [savedRecipes, setSavedRecipes] = useState<SavedRecipeSummary[]>([]);
  const [activeSavedRecipeId, setActiveSavedRecipeId] = useState<string | null>(null);
  const [activeSavedRecipe, setActiveSavedRecipe] = useState<SavedRecipe | null>(null);
  const [savedRecipesError, setSavedRecipesError] = useState<string | null>(null);
  const [recipeImportMessage, setRecipeImportMessage] = useState<string | null>(null);

  const loadSavedRecipes = useCallback(async (): Promise<void> => {
    if (useCloudRecipes && user) {
      try {
        setSavedRecipesError(null);
        const { imported } = await importLocalRecipesIfNeeded(user.id);
        if (imported > 0) {
          setRecipeImportMessage(
            imported === 1
              ? 'Imported 1 recipe from this device.'
              : `Imported ${imported} recipes from this device.`,
          );
        }

        setSavedRecipes(await listRemoteRecipeSummaries(user.id));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load saved recipes.';
        setSavedRecipesError(message);
      }
      return;
    }

    setSavedRecipesError(null);
    setSavedRecipes(listSavedRecipeSummaries());
  }, [useCloudRecipes, user]);

  const refreshSavedRecipes = useCallback(async (): Promise<void> => {
    await loadSavedRecipes();
  }, [loadSavedRecipes]);

  const fetchSavedRecipe = useCallback(
    async (id: string): Promise<SavedRecipe | null> => {
      if (useCloudRecipes && user) {
        return getRemoteSavedRecipe(user.id, id);
      }

      return getSavedRecipe(id);
    },
    [useCloudRecipes, user],
  );

  const duplicateRecipe = useCallback(
    async (id: string): Promise<void> => {
      if (useCloudRecipes && user) {
        const duplicate = await duplicateRemoteSavedRecipe(user.id, id);
        if (duplicate) {
          await refreshSavedRecipes();
        }
        return;
      }

      const duplicate = duplicateSavedRecipe(id);
      if (duplicate) {
        await refreshSavedRecipes();
      }
    },
    [refreshSavedRecipes, useCloudRecipes, user],
  );

  const deleteRecipe = useCallback(
    async (id: string): Promise<void> => {
      if (useCloudRecipes && user) {
        await deleteRemoteSavedRecipe(user.id, id);
      } else {
        deleteSavedRecipe(id);
      }

      if (activeSavedRecipeId === id) {
        setActiveSavedRecipeId(null);
        setActiveSavedRecipe(null);
      }

      await refreshSavedRecipes();
    },
    [activeSavedRecipeId, refreshSavedRecipes, useCloudRecipes, user],
  );

  const persistRecipe = useCallback(
    async (params: {
      name: string;
      recipeInput: RecipeInput;
      scheduleInput: ScheduleInput;
      includeSchedule: boolean;
      recipeId?: string | null;
    }): Promise<SavedRecipe> => {
      const payload = {
        id: params.recipeId ?? activeSavedRecipeId ?? undefined,
        name: params.name,
        recipeInput: params.recipeInput,
        scheduleInput: params.includeSchedule ? params.scheduleInput : undefined,
      };

      const saved =
        useCloudRecipes && user
          ? await upsertRemoteSavedRecipe(user.id, payload)
          : upsertSavedRecipe(payload);

      setActiveSavedRecipeId(saved.id);
      setActiveSavedRecipe(saved);
      await refreshSavedRecipes();
      return saved;
    },
    [activeSavedRecipeId, refreshSavedRecipes, useCloudRecipes, user],
  );

  useEffect(() => {
    void loadSavedRecipes();
  }, [loadSavedRecipes]);

  useEffect(() => {
    if (!recipeImportMessage) {
      return;
    }

    const timer = window.setTimeout(() => setRecipeImportMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [recipeImportMessage]);

  return {
    useCloudRecipes,
    savedRecipes,
    savedRecipesError,
    recipeImportMessage,
    activeSavedRecipeId,
    activeSavedRecipe,
    setActiveSavedRecipeId,
    setActiveSavedRecipe,
    loadSavedRecipes,
    refreshSavedRecipes,
    fetchSavedRecipe,
    duplicateRecipe,
    deleteRecipe,
    persistRecipe,
  };
}
