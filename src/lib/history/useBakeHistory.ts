import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import type { AppMainTab } from '../../components/AppBottomNav.tsx';
import {
  deleteRemoteBakeHistorySession,
  getRemoteBakeHistorySession,
  listRemoteBakeHistorySummaries,
  updateRemoteBakeHistorySession,
} from './remoteBakeHistoryStorage.ts';
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
  onRequireAuth: () => void;
};

export function useBakeHistory({
  user,
  isConfigured,
  mainTab,
  historyDetailId,
  onRequireAuth,
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
      setBakeHistory([]);
      setBakeHistoryLoadError(null);
      return;
    }

    try {
      setBakeHistoryLoadError(null);
      setBakeHistory(await listRemoteBakeHistorySummaries(user.id));
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
      if (!user) {
        onRequireAuth();
        return;
      }

      setIsLoadingHistoryDetail(true);
      setActiveHistorySession(null);
      setHistoryDetailLoadError(null);

      try {
        const session = await getRemoteBakeHistorySession(user.id, id);
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
    [clearHistoryDetailState, loadBakeHistory, onRequireAuth, user],
  );

  const updateHistoryDetail = useCallback(
    async (input: UpdateBakeHistorySessionInput): Promise<void> => {
      if (!user || !historyDetailId) {
        return;
      }

      setIsSavingHistoryDetail(true);
      setHistoryDetailError(null);

      try {
        const updated = await updateRemoteBakeHistorySession(user.id, historyDetailId, input);
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
    [historyDetailId, loadBakeHistory, user],
  );

  const deleteHistoryDetail = useCallback(async (): Promise<void> => {
    if (!user || !historyDetailId) {
      return;
    }

    setIsSavingHistoryDetail(true);
    setHistoryDetailError(null);

    try {
      await deleteRemoteBakeHistorySession(user.id, historyDetailId);
      await loadBakeHistory();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete bake history.';
      setHistoryDetailError(message);
    } finally {
      setIsSavingHistoryDetail(false);
    }
  }, [historyDetailId, loadBakeHistory, user]);

  useEffect(() => {
    void loadBakeHistory();
  }, [loadBakeHistory]);

  useEffect(() => {
    if (mainTab === 'history' && user) {
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
