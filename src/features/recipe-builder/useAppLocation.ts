import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';

import type { AppMainTab } from '../../components/AppBottomNav.tsx';
import { isRecipeDirty } from '../../lib/recipe/isRecipeDirty.ts';
import type { RecipeInput } from '../../lib/recipe/types.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import type { SavedRecipe } from '../../lib/storage/types.ts';
import type { AppLocation } from './appLocation.ts';
import { showHomeButton as getShowHomeButton } from './appLocation.ts';
import { APP_ROUTES, isBuilderPath, shouldBlockUnsavedNavigation, type AppRouteNavigate } from './appRoutes.ts';
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
  pathname: string;
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
  pathname,
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
  const [leaveDialogMode, setLeaveDialogMode] = useState<'unsaved' | 'save' | null>(null);
  const [isSavingExistingRecipe, setIsSavingExistingRecipe] = useState(false);
  const [unsavedSaveError, setUnsavedSaveError] = useState<string | null>(null);
  const [pendingGoHomeAfterSave, setPendingGoHomeAfterSave] = useState(false);
  const [pendingStartBakeAfterSave, setPendingStartBakeAfterSave] = useState(false);
  const pendingBlockedNavigation = useRef(false);
  // Intentional discard must bypass useBlocker: isRecipeDirty can stay true until the
  // route leaves /build/* (see docs/engineering/leave-dialog-and-unsaved-navigation.md).
  const isDiscardingChangesRef = useRef(false);

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
    }) => {
      if (isDiscardingChangesRef.current) {
        return false;
      }

      return shouldBlockUnsavedNavigation({
        currentPathname: currentLocation.pathname,
        nextPathname: nextLocation.pathname,
        isDirty,
        phase: location.phase,
      });
    },
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
    setLeaveDialogMode(null);
    setIsSavingExistingRecipe(false);
    setUnsavedSaveError(null);
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
      setLeaveDialogMode('unsaved');
    }
  }, [blocker.state]);

  useEffect(() => {
    if (!isBuilderPath(pathname)) {
      isDiscardingChangesRef.current = false;
    }
  }, [pathname]);

  const goHome = useCallback((): void => {
    if (location.phase === 'companion') {
      stashSessionOnLeaveCompanion();
      performGoHome();
      return;
    }

    if (isDirty) {
      pendingBlockedNavigation.current = false;
      setUnsavedSaveError(null);
      setLeaveDialogMode('unsaved');
      return;
    }

    performGoHome();
  }, [isDirty, location.phase, performGoHome, stashSessionOnLeaveCompanion]);

  const cancelLeaveDialog = useCallback((): void => {
    setLeaveDialogMode(null);
    setIsSavingExistingRecipe(false);
    setUnsavedSaveError(null);
    setPendingGoHomeAfterSave(false);

    if (blocker.state === 'blocked') {
      blocker.reset();
      pendingBlockedNavigation.current = false;
    }
  }, [blocker]);

  const discardUnsavedChanges = useCallback((): void => {
    isDiscardingChangesRef.current = true;

    if (activeSavedRecipe) {
      restoreFromSavedRecipe(activeSavedRecipe);
    } else {
      restoreToDefaults();
    }

    finishLeaving();
  }, [activeSavedRecipe, finishLeaving, restoreFromSavedRecipe, restoreToDefaults]);

  const saveBeforeLeavingHome = useCallback((): void => {
    setUnsavedSaveError(null);

    if (activeSavedRecipeId && activeSavedRecipe) {
      setIsSavingExistingRecipe(true);
      void saveActiveRecipe(
        activeSavedRecipe.name,
        wizard.hasOpenedSchedule || saveDialogSource === 'schedule',
      )
        .then(() => {
          finishLeaving();
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Failed to save recipe.';
          setUnsavedSaveError(message);
          setIsSavingExistingRecipe(false);
          setLeaveDialogMode('unsaved');
        });
      return;
    }

    setPendingGoHomeAfterSave(true);
    setSaveDialogSource(wizard.hasOpenedSchedule ? 'schedule' : 'results');
    setLeaveDialogMode('save');
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
      const targetPath = tab === 'history' ? APP_ROUTES.history : APP_ROUTES.home;
      const navigationAllowed =
        !isDirty || location.phase === 'companion' || pathname === targetPath;

      if (tab === 'history') {
        routes.toHistory();
      } else {
        routes.toHome();
      }

      if (navigationAllowed) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    },
    [isDirty, location.phase, pathname, routes],
  );

  const openSaveDialog = useCallback((source: SaveDialogSource): void => {
    setSaveDialogSource(source);
    setIsSaveDialogOpen(true);
  }, []);

  const closeSaveDialog = useCallback((): void => {
    setIsSaveDialogOpen(false);
    setLeaveDialogMode(null);
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
    isDirty,
    isSaveDialogOpen,
    saveDialogSource,
    pendingDeleteRecipeId,
    leaveDialogMode,
    isSavingExistingRecipe,
    unsavedSaveError,
    cancelLeaveDialog,
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
