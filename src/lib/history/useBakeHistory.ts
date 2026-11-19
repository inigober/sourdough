import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import type { AppMainTab } from '../../components/AppBottomNav.tsx';
import { importLocalRecipesIfNeeded } from '../storage/importLocalRecipes.ts';
import { listRemoteRecipeSummaries } from '../storage/remoteRecipeStorage.ts';
import { retryPendingPhotoUploads } from './bakePhotos.ts';
import { importLocalBakeHistoryIfNeeded } from './importLocalBakeHistory.ts';
import { getDefaultBakePhotoStore } from './localBakePhotoStorage.ts';
import {
  deleteLocalBakeHistorySession,
  getLocalBakeHistorySession,
  listLocalBakeHistorySessions,
  listLocalBakeHistorySummaries,
  updateLocalBakeHistorySession,
} from './localBakeHistoryStorage.ts';
import {
  createRemoteBakeHistorySession,
  deleteRemoteBakeHistorySession,
  getRemoteBakeHistorySession,
  listRemoteBakeHistorySummaries,
  updateRemoteBakeHistorySession,
} from './remoteBakeHistoryStorage.ts';
import { uploadRemoteBakePhoto } from './remoteBakePhotoStorage.ts';
import type {
  BakeHistorySession,
  BakeHistorySessionSummary,
  UpdateBakeHistorySessionInput,
} from './types.ts';

type UseBakeHistoryOptions = {
  user: User | null;
  isConfigured: boolean;
  mainTab: AppMainTab;
  historyDetailId: string | null;
};

export function useBakeHistory({
  user,
  isConfigured,
  mainTab,
  historyDetailId,
}: UseBakeHistoryOptions) {
  const useCloudHistory = Boolean(user && isConfigured);

  const [bakeHistory, setBakeHistory] = useState<BakeHistorySessionSummary[]>([]);
  const [bakeHistoryLoadError, setBakeHistoryLoadError] = useState<string | null>(null);
  const [activeHistorySession, setActiveHistorySession] = useState<BakeHistorySession | null>(null);
  const [isLoadingHistoryDetail, setIsLoadingHistoryDetail] = useState(false);
  const [isSavingHistoryDetail, setIsSavingHistoryDetail] = useState(false);
  const [historyDetailError, setHistoryDetailError] = useState<string | null>(null);
  const [historyDetailLoadError, setHistoryDetailLoadError] = useState<string | null>(null);

  const loadBakeHistory = useCallback(async (): Promise<void> => {
    if (!useCloudHistory || !user) {
      // Signed out: history lives on this device.
      setBakeHistoryLoadError(null);
      setBakeHistory(listLocalBakeHistorySummaries());
      return;
    }

    try {
      setBakeHistoryLoadError(null);
      const importError = await importLocalBakesAfterSignIn(user.id);
      let summaries = await listRemoteBakeHistorySummaries(user.id);
      // Photos whose upload failed earlier are retried whenever History loads.
      const retried = await retryPendingPhotoUploads({
        userId: user.id,
        remoteBakes: summaries,
        store: getDefaultBakePhotoStore(),
        uploadRemote: uploadRemoteBakePhoto,
      });
      if (retried > 0) {
        summaries = await listRemoteBakeHistorySummaries(user.id);
      }
      setBakeHistory(summaries);
      // Shown with "Try again", which retries the import. The bakes stay on this device meanwhile.
      setBakeHistoryLoadError(importError);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load bake history.';
      setBakeHistoryLoadError(message);
    }
  }, [useCloudHistory, user]);

  const clearHistoryDetailState = useCallback((): void => {
    setActiveHistorySession(null);
    setHistoryDetailError(null);
    setHistoryDetailLoadError(null);
    setIsLoadingHistoryDetail(false);
  }, []);

  const loadHistoryDetail = useCallback(
    async (id: string): Promise<void> => {
      setIsLoadingHistoryDetail(true);
      setActiveHistorySession(null);
      setHistoryDetailLoadError(null);

      try {
        const session =
          useCloudHistory && user
            ? await getRemoteBakeHistorySession(user.id, id)
            : getLocalBakeHistorySession(id);
        if (!session) {
          clearHistoryDetailState();
          await loadBakeHistory();
          return;
        }

        setActiveHistorySession(session);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load bake details.';
        setHistoryDetailLoadError(message);
      } finally {
        setIsLoadingHistoryDetail(false);
      }
    },
    [clearHistoryDetailState, loadBakeHistory, useCloudHistory, user],
  );

  const updateHistoryDetail = useCallback(
    async (input: UpdateBakeHistorySessionInput): Promise<void> => {
      if (!historyDetailId) {
        return;
      }

      setIsSavingHistoryDetail(true);
      setHistoryDetailError(null);

      try {
        const updated =
          useCloudHistory && user
            ? await updateRemoteBakeHistorySession(user.id, historyDetailId, input)
            : updateLocalBakeHistorySession(historyDetailId, input);
        setActiveHistorySession(updated);
        await loadBakeHistory();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update bake history.';
        setHistoryDetailError(message);
        throw error;
      } finally {
        setIsSavingHistoryDetail(false);
      }
    },
    [historyDetailId, loadBakeHistory, useCloudHistory, user],
  );

  const deleteHistoryDetail = useCallback(async (): Promise<void> => {
    if (!historyDetailId) {
      return;
    }

    setIsSavingHistoryDetail(true);
    setHistoryDetailError(null);

    try {
      if (useCloudHistory && user) {
        await deleteRemoteBakeHistorySession(user.id, historyDetailId);
      } else {
        deleteLocalBakeHistorySession(historyDetailId);
        // Best effort: a leftover photo only wastes space on this device.
        await getDefaultBakePhotoStore()
          .remove(historyDetailId)
          .catch(() => undefined);
      }

      await loadBakeHistory();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete bake history.';
      setHistoryDetailError(message);
    } finally {
      setIsSavingHistoryDetail(false);
    }
  }, [historyDetailId, loadBakeHistory, useCloudHistory, user]);

  useEffect(() => {
    void loadBakeHistory();
  }, [loadBakeHistory]);

  useEffect(() => {
    if (mainTab === 'history') {
      void loadBakeHistory();
    }
  }, [loadBakeHistory, mainTab, user?.id]);

  useEffect(() => {
    if (!historyDetailId) {
      clearHistoryDetailState();
      return;
    }

    void loadHistoryDetail(historyDetailId);
  }, [clearHistoryDetailState, historyDetailId, loadHistoryDetail]);

  return {
    bakeHistory,
    bakeHistoryLoadError,
    activeHistorySession,
    isLoadingHistoryDetail,
    isSavingHistoryDetail,
    historyDetailError,
    historyDetailLoadError,
    loadBakeHistory,
    updateHistoryDetail,
    deleteHistoryDetail,
  };
}

/**
 * Moves bakes saved on this device while signed out into the account. Recipes are imported
 * first so a bake can keep its link to its recipe. Returns an error message instead of throwing,
 * so the account's own history still loads when the import fails.
 */
async function importLocalBakesAfterSignIn(userId: string): Promise<string | null> {
  if (listLocalBakeHistorySessions().length === 0) {
    return null;
  }

  try {
    await importLocalRecipesIfNeeded(userId);
    await importLocalBakeHistoryIfNeeded(userId, {
      listRemoteSummaries: listRemoteBakeHistorySummaries,
      listRemoteRecipeIds: async (id) => (await listRemoteRecipeSummaries(id)).map((recipe) => recipe.id),
      createRemote: createRemoteBakeHistorySession,
      photos: { store: getDefaultBakePhotoStore(), uploadRemote: uploadRemoteBakePhoto },
    });
    return null;
  } catch (error) {
    const reason = error instanceof Error && error.message ? ` (${error.message})` : '';
    return `Bakes saved on this device could not be backed up yet${reason}. They are still on this device.`;
  }
}
