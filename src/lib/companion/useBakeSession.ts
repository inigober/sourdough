import { useCallback, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { createBakeSession } from './bakeSession.ts';
import type { BakeSession } from './types.ts';
import { buildBakeHistoryStepsFromSession } from '../history/buildBakeHistorySteps.ts';
import { createRemoteBakeHistorySession } from '../history/remoteBakeHistoryStorage.ts';
import type { RecipeInput } from '../recipe/types.ts';
import type { ScheduleInput } from '../schedule/types.ts';
import {
  clearBakeSession,
  loadBakeSession,
  saveBakeSession,
} from '../storage/bakeSessionStorage.ts';
import type { BakeCompleteSaveInput } from './types.ts';

export type BeginBakeSessionOptions = {
  savedRecipeId: string | null;
  recipeName: string;
  recipe: RecipeInput;
  schedule: ScheduleInput;
};

type UseBakeSessionOptions = {
  user: User | null;
  onRequireAuth: () => void;
  onBakeSavedToHistory: () => void;
};

function applyBeginBakeSession(options: BeginBakeSessionOptions): BakeSession {
  const session = createBakeSession({
    savedRecipeId: options.savedRecipeId,
    recipeName: options.recipeName,
    recipeInput: options.recipe,
    scheduleInput: options.schedule,
  });

  saveBakeSession(session);
  return session;
}

export function useBakeSession({ user, onRequireAuth, onBakeSavedToHistory }: UseBakeSessionOptions) {
  const [bakeSession, setBakeSession] = useState<BakeSession | null>(null);
  const [resumableBakeSession, setResumableBakeSession] = useState<BakeSession | null>(() =>
    loadBakeSession(),
  );
  const [pendingBeginOptions, setPendingBeginOptions] = useState<BeginBakeSessionOptions | null>(null);
  const [isStartingBake, setIsStartingBake] = useState(false);
  const [isSavingBakeHistory, setIsSavingBakeHistory] = useState(false);
  const [saveBakeHistoryError, setSaveBakeHistoryError] = useState<string | null>(null);

  const refreshResumableBakeSession = useCallback((): void => {
    setResumableBakeSession(loadBakeSession());
  }, []);

  const beginBakeSession = useCallback((options: BeginBakeSessionOptions): void => {
    const session = applyBeginBakeSession(options);
    setBakeSession(session);
    setResumableBakeSession(session);
    setPendingBeginOptions(null);
    setSaveBakeHistoryError(null);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const tryBeginBakeSession = useCallback(
    (options: BeginBakeSessionOptions, options2?: { force?: boolean }): boolean => {
      const existing = loadBakeSession();
      if (!options2?.force && existing) {
        setPendingBeginOptions(options);
        return false;
      }

      beginBakeSession(options);
      return true;
    },
    [beginBakeSession],
  );

  const confirmPendingBeginBakeSession = useCallback((): void => {
    if (!pendingBeginOptions) {
      return;
    }

    beginBakeSession(pendingBeginOptions);
  }, [beginBakeSession, pendingBeginOptions]);

  const cancelPendingBeginBakeSession = useCallback((): void => {
    setPendingBeginOptions(null);
  }, []);

  const resumeBakeSession = useCallback((): void => {
    const session = loadBakeSession();
    if (!session) {
      refreshResumableBakeSession();
      return;
    }

    setBakeSession(session);
    setResumableBakeSession(session);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [refreshResumableBakeSession]);

  const updateBakeSession = useCallback((session: BakeSession): void => {
    saveBakeSession(session);
    setBakeSession(session);
  }, []);

  const stashSessionOnLeaveCompanion = useCallback((): void => {
    if (bakeSession) {
      saveBakeSession(bakeSession);
      setResumableBakeSession(bakeSession);
    }

    setBakeSession(null);
  }, [bakeSession]);

  const clearSessionAfterFinish = useCallback((): void => {
    clearBakeSession();
    setResumableBakeSession(null);
    setBakeSession(null);
    setPendingBeginOptions(null);
    setSaveBakeHistoryError(null);
  }, []);

  const saveCompletedBake = useCallback(
    async (input: BakeCompleteSaveInput): Promise<boolean> => {
      if (!bakeSession) {
        return false;
      }

      if (!user) {
        setSaveBakeHistoryError('Sign in to save this bake to your history.');
        onRequireAuth();
        return false;
      }

      setIsSavingBakeHistory(true);
      setSaveBakeHistoryError(null);

      try {
        const completedAt = new Date().toISOString();
        const steps = buildBakeHistoryStepsFromSession(bakeSession, completedAt);

        await createRemoteBakeHistorySession(user.id, {
          savedRecipeId: bakeSession.savedRecipeId ?? undefined,
          recipeName: bakeSession.recipeName,
          recipeInput: bakeSession.recipeInput,
          scheduleInput: bakeSession.scheduleInput,
          overallNote: input.note,
          overallAssessment: input.assessment,
          startedAt: bakeSession.startedAt,
          completedAt,
          steps,
        });

        onBakeSavedToHistory();
        clearSessionAfterFinish();
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save bake history.';
        setSaveBakeHistoryError(message);
        return false;
      } finally {
        setIsSavingBakeHistory(false);
      }
    },
    [bakeSession, clearSessionAfterFinish, onBakeSavedToHistory, onRequireAuth, user],
  );

  const runStartBake = useCallback(async (start: () => Promise<void>): Promise<void> => {
    setIsStartingBake(true);
    try {
      await start();
    } finally {
      setIsStartingBake(false);
    }
  }, []);

  return {
    bakeSession,
    resumableBakeSession,
    pendingOverwriteBakeName: pendingBeginOptions?.recipeName ?? null,
    isStartingBake,
    isSavingBakeHistory,
    saveBakeHistoryError,
    setSaveBakeHistoryError,
    beginBakeSession,
    tryBeginBakeSession,
    confirmPendingBeginBakeSession,
    cancelPendingBeginBakeSession,
    resumeBakeSession,
    updateBakeSession,
    refreshResumableBakeSession,
    stashSessionOnLeaveCompanion,
    clearSessionAfterFinish,
    saveCompletedBake,
    runStartBake,
  };
}
