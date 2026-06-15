import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';

import type { AppMainTab } from '../../components/AppBottomNav.tsx';
import { isRecipeDirty } from '../../lib/recipe/isRecipeDirty.ts';
import type { RecipeInput } from '../../lib/recipe/types.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import type { SavedRecipe } from '../../lib/storage/types.ts';
import type { AppLocation } from './appLocation.ts';
import { showHomeButton as getShowHomeButton } from './appLocation.ts';
import type { AppRouteNavigate } from './appRoutes.ts';
import type { RecipeBuilderStep } from './recipeBuilderSteps.ts';
import type { SaveDialogSource } from './types.ts';

type WizardSnapshot = {
  currentStep: RecipeBuilderStep;
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  hasOpenedSchedule: boolean;
  hasCompletedWizard: boolean;
};

type UseAppNavigationOptions = {
  location: AppLocation;
  routes: AppRouteNavigate;
  wizard: WizardSnapshot;
  activeSavedRecipe: SavedRecipe | null;
  activeSavedRecipeId: string | null;
  resetToWelcome: () => void;
  restoreFromSavedRecipe: (saved: SavedRecipe) => void;
  restoreToDefaults: () => void;
  refreshDraftSummary: () => void;
  stashSessionOnLeaveCompanion: () => void;
  refreshResumableBakeSession: () => void;
  saveActiveRecipe: (name: string, includeSchedule: boolean) => Promise<SavedRecipe>;
};

export function useAppNavigation({
  location,
  routes,
  wizard,
  activeSavedRecipe,
  activeSavedRecipeId,
  resetToWelcome,
  restoreFromSavedRecipe,
  restoreToDefaults,
  refreshDraftSummary,
  stashSessionOnLeaveCompanion,
  refreshResumableBakeSession,
  saveActiveRecipe,
}: UseAppNavigationOptions) {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveDialogSource, setSaveDialogSource] = useState<SaveDialogSource>('results');
  const [pendingDeleteRecipeId, setPendingDeleteRecipeId] = useState<string | null>(null);
  const [isUnsavedDialogOpen, setIsUnsavedDialogOpen] = useState(false);
  const [pendingGoHomeAfterSave, setPendingGoHomeAfterSave] = useState(false);
  const [pendingStartBakeAfterSave, setPendingStartBakeAfterSave] = useState(false);
  const pendingBlockedNavigation = useRef(false);

  const isDirty = useMemo(
    () =>
      isRecipeDirty({
        phase: location.phase,
        currentStep: wizard.currentStep,
        recipeInput: wizard.recipeInput,
        scheduleInput: wizard.scheduleInput,
        hasOpenedSchedule: wizard.hasOpenedSchedule,
        hasCompletedWizard: wizard.hasCompletedWizard,
        activeSavedRecipe,
      }),
    [activeSavedRecipe, location.phase, wizard],
  );

  const shouldBlockRouteChange = useCallback(
    ({
      currentLocation,
      nextLocation,
    }: {
      currentLocation: { pathname: string };
      nextLocation: { pathname: string };
    }) =>
      location.phase !== 'companion' &&
      isDirty &&
      currentLocation.pathname !== nextLocation.pathname,
    [isDirty, location.phase],
  );

  const blocker = useBlocker(shouldBlockRouteChange);

  const showHomeButton = useMemo(
    () => getShowHomeButton(location, wizard.currentStep),
    [location, wizard.currentStep],
  );

  const finishLeaving = useCallback((): void => {
    resetToWelcome();
    setIsSaveDialogOpen(false);
    setPendingDeleteRecipeId(null);
    setIsUnsavedDialogOpen(false);
    setPendingGoHomeAfterSave(false);
    refreshDraftSummary();
    refreshResumableBakeSession();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    if (blocker.state === 'blocked') {
      blocker.proceed();
      pendingBlockedNavigation.current = false;
      return;
    }

    routes.toHome();
  }, [blocker, refreshDraftSummary, refreshResumableBakeSession, resetToWelcome, routes]);

  const performGoHome = useCallback((): void => {
    finishLeaving();
  }, [finishLeaving]);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      pendingBlockedNavigation.current = true;
      setIsUnsavedDialogOpen(true);
    }
  }, [blocker.state]);

  const goHome = useCallback((): void => {
    if (location.phase === 'companion') {
      stashSessionOnLeaveCompanion();
      performGoHome();
      return;
    }

    if (isDirty) {
      pendingBlockedNavigation.current = false;
      setIsUnsavedDialogOpen(true);
      return;
    }

    performGoHome();
  }, [isDirty, location.phase, performGoHome, stashSessionOnLeaveCompanion]);

  const cancelUnsavedDialog = useCallback((): void => {
    setIsUnsavedDialogOpen(false);

    if (blocker.state === 'blocked') {
      blocker.reset();
      pendingBlockedNavigation.current = false;
    }
  }, [blocker]);

  const discardUnsavedChanges = useCallback((): void => {
    if (activeSavedRecipe) {
      restoreFromSavedRecipe(activeSavedRecipe);
    } else {
      restoreToDefaults();
    }

    finishLeaving();
  }, [activeSavedRecipe, finishLeaving, restoreFromSavedRecipe, restoreToDefaults]);

  const saveBeforeLeavingHome = useCallback((): void => {
    setIsUnsavedDialogOpen(false);

    if (activeSavedRecipeId && activeSavedRecipe) {
      void saveActiveRecipe(
        activeSavedRecipe.name,
        wizard.hasOpenedSchedule || saveDialogSource === 'schedule',
      ).then(() => {
        finishLeaving();
      });
      return;
    }

    setPendingGoHomeAfterSave(true);
    setSaveDialogSource(wizard.hasOpenedSchedule ? 'schedule' : 'results');
    setIsSaveDialogOpen(true);
  }, [
    activeSavedRecipe,
    activeSavedRecipeId,
    finishLeaving,
    saveActiveRecipe,
    saveDialogSource,
    wizard.hasOpenedSchedule,
  ]);

  const handleMainTabChange = useCallback(
    (tab: AppMainTab): void => {
      if (tab === 'history') {
        routes.toHistory();
      } else {
        routes.toHome();
      }

      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    },
    [routes],
  );

  const openSaveDialog = useCallback((source: SaveDialogSource): void => {
    setSaveDialogSource(source);
    setIsSaveDialogOpen(true);
  }, []);

  const closeSaveDialog = useCallback((): void => {
    setIsSaveDialogOpen(false);
    setPendingGoHomeAfterSave(false);
    setPendingStartBakeAfterSave(false);
  }, []);

  const requestDeleteRecipe = useCallback((id: string): void => {
    setPendingDeleteRecipeId(id);
  }, []);

  const clearPendingDeleteRecipe = useCallback((): void => {
    setPendingDeleteRecipeId(null);
  }, []);

  const enterCompanion = useCallback((): void => {
    routes.toBake();
  }, [routes]);

  const returnToResults = useCallback((): void => {
    routes.toSummary();
  }, [routes]);

  return {
    isSaveDialogOpen,
    saveDialogSource,
    pendingDeleteRecipeId,
    isUnsavedDialogOpen,
    setIsUnsavedDialogOpen: cancelUnsavedDialog,
    pendingGoHomeAfterSave,
    pendingStartBakeAfterSave,
    setPendingStartBakeAfterSave,
    showHomeButton,
    performGoHome,
    goHome,
    discardUnsavedChanges,
    saveBeforeLeavingHome,
    handleMainTabChange,
    openSaveDialog,
    closeSaveDialog,
    requestDeleteRecipe,
    clearPendingDeleteRecipe,
    enterCompanion,
    returnToResults,
  };
}
