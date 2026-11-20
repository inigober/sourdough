import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { assessRecipe } from '../../lib/recipe/assessRecipe.ts';
import { calculateRecipe } from '../../lib/recipe/calculateRecipe.ts';
import { defaultRecipeInput, getLevainHydrationForType } from '../../lib/recipe/defaults.ts';
import {
  addFlourEntry,
  getPrimaryFlourType,
  removeFlourEntry,
  stepFlourPercent,
  updateFlourPercent as setFlourPercentInBlend,
  updateFlourType as setFlourTypeInBlend,
} from '../../lib/recipe/flourBlend.ts';
import { cloneTemplateRecipeInput, getRecipeTemplate } from '../../lib/recipe/templates.ts';
import {
  hasBlockingValidationIssue,
  hasMissingNumber,
  validateRecipeInput,
} from '../../lib/recipe/validation.ts';
import type {
  FlourType,
  LevainActivity,
  LevainType,
  RecipeInput,
} from '../../lib/recipe/types.ts';
import { createDefaultScheduleInput } from '../../lib/schedule/defaults.ts';
import { normalizeScheduleInput } from '../../lib/schedule/normalizeScheduleInput.ts';
import { withoutCalendarDate } from '../../lib/schedule/relativeDays.ts';
import { scaleScheduleBakeParamsForDoughSize } from '../../lib/schedule/scaleScheduleBakeParams.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import {
  clearBuilderDraft,
  getBuilderDraftSummary,
  isUntouchedBuilderState,
  loadBuilderDraft,
  saveBuilderDraft,
  type BuilderDraftSummary,
} from '../../lib/storage/draftStorage.ts';
import {
  decideBuilderDraftRestore,
  resolveRestoredDraftState,
  type RestoredBuilderState,
} from '../../lib/storage/restoreBuilderDraft.ts';
import type { SavedRecipe } from '../../lib/storage/types.ts';
import type { DoughSizeNumberField } from './DoughSizeSection.tsx';
import type { FermentationNumberField } from './FermentationSection.tsx';
import type { RecipeTargetsNumberField } from './RecipeTargetsSection.tsx';
import {
  getNextStep,
  getPreviousStep,
  getWizardContinueEnabled,
  isInputWizardStep,
  type RecipeBuilderStep,
} from './recipeBuilderSteps.ts';
import type { AppRouteNavigate } from './appRoutes.ts';
import { buildAppPathFromDraft } from './appRoutes.ts';
import type { BuilderPhase } from './types.ts';

export type WizardNumberField = DoughSizeNumberField | RecipeTargetsNumberField | FermentationNumberField;

type UseRecipeWizardOptions = {
  phase: BuilderPhase;
  routeStep: RecipeBuilderStep;
  routes: AppRouteNavigate;
  activeSavedRecipeId: string | null;
  setActiveSavedRecipeId: (id: string | null) => void;
  setActiveSavedRecipe: (recipe: SavedRecipe | null) => void;
  fetchSavedRecipe: (id: string) => Promise<SavedRecipe | null>;
  userId: string | undefined;
  useCloudRecipes: boolean;
  /** True while sign-in is still being checked, so saved recipes cannot be looked up yet. */
  isAuthLoading: boolean;
};

export function useRecipeWizard({
  phase,
  routeStep,
  routes,
  activeSavedRecipeId,
  setActiveSavedRecipeId,
  setActiveSavedRecipe,
  fetchSavedRecipe,
  userId,
  useCloudRecipes,
  isAuthLoading,
}: UseRecipeWizardOptions) {
  const [hasCompletedWizard, setHasCompletedWizard] = useState(false);
  const [editingFromResults, setEditingFromResults] = useState(false);
  const [hasOpenedSchedule, setHasOpenedSchedule] = useState(false);
  const [recipeInput, setRecipeInput] = useState<RecipeInput>(defaultRecipeInput);
  const [scheduleInput, setScheduleInput] = useState<ScheduleInput>(() =>
    createDefaultScheduleInput(defaultRecipeInput),
  );
  const [draftSummary, setDraftSummary] = useState<BuilderDraftSummary | null>(null);
  // What the builder starts with, to tell "nothing happened yet" from a real recipe in progress.
  const initialBuilderStateRef = useRef({ recipeInput, scheduleInput });
  // The latest builder state, readable from async code that must not act on a stale render.
  const latestBuilderStateRef = useRef({
    recipeInput,
    scheduleInput,
    hasCompletedWizard,
    editingFromResults,
    hasOpenedSchedule,
    activeSavedRecipeId,
  });
  latestBuilderStateRef.current = {
    recipeInput,
    scheduleInput,
    hasCompletedWizard,
    editingFromResults,
    hasOpenedSchedule,
    activeSavedRecipeId,
  };
  // Only a page that first loaded on a builder route (a refresh of /build/...) restores its draft.
  const startedOnBuilderRouteRef = useRef(
    phase !== 'companion' && !(phase === 'wizard' && routeStep === 'welcome'),
  );
  const hasSettledDraftRestoreRef = useRef(false);

  const validationIssues = useMemo(() => validateRecipeInput(recipeInput), [recipeInput]);
  const hasBlockingIssues = hasBlockingValidationIssue(validationIssues);
  const formula = useMemo(
    () => (hasBlockingIssues ? null : calculateRecipe(recipeInput)),
    [hasBlockingIssues, recipeInput],
  );
  const assessmentSections = useMemo(
    () => (formula ? assessRecipe(recipeInput, formula) : []),
    [formula, recipeInput],
  );

  const canGoBack = getPreviousStep(routeStep) !== null;
  const canContinue = getWizardContinueEnabled(validationIssues, routeStep);
  const isLastWizardStep = routeStep === 'fermentation';
  const showReturnToSummary = hasCompletedWizard && editingFromResults;

  const refreshDraftSummary = useCallback((): void => {
    setDraftSummary(getBuilderDraftSummary());
  }, []);

  useEffect(() => {
    setDraftSummary(getBuilderDraftSummary());
  }, [useCloudRecipes, userId]);

  useEffect(() => {
    if (phase === 'companion') {
      return;
    }

    // A cleared field is not a recipe worth resuming. Keep the last complete draft instead.
    if (hasMissingNumber(recipeInput)) {
      return;
    }

    // On page load the builder holds defaults while a real draft may be waiting in storage (the Resume card
    // reads it). Saving untouched defaults here would replace that draft.
    if (
      isUntouchedBuilderState(
        { recipeInput, scheduleInput, hasCompletedWizard, editingFromResults, hasOpenedSchedule, activeSavedRecipeId },
        initialBuilderStateRef.current,
      )
    ) {
      return;
    }

    saveBuilderDraft({
      phase,
      currentStep: routeStep,
      hasCompletedWizard,
      editingFromResults,
      hasOpenedSchedule,
      recipeInput,
      scheduleInput,
      activeSavedRecipeId,
    });
    setDraftSummary(getBuilderDraftSummary());
  }, [
    phase,
    routeStep,
    hasCompletedWizard,
    editingFromResults,
    hasOpenedSchedule,
    recipeInput,
    scheduleInput,
    activeSavedRecipeId,
  ]);

  const applyRestoredState = useCallback(
    (restored: RestoredBuilderState): void => {
      setRecipeInput(restored.recipeInput);
      setScheduleInput(restored.scheduleInput);
      setActiveSavedRecipeId(restored.activeSavedRecipeId);
      setActiveSavedRecipe(restored.activeSavedRecipe);
      setHasCompletedWizard(restored.hasCompletedWizard);
      setEditingFromResults(restored.editingFromResults);
      setHasOpenedSchedule(restored.hasOpenedSchedule);
    },
    [setActiveSavedRecipe, setActiveSavedRecipeId],
  );

  // A browser refresh on /build/... starts with an empty builder. Put the stored draft back, but stay on the
  // page the baker is on. Decision rules live in lib/storage/restoreBuilderDraft.ts.
  useEffect(() => {
    if (hasSettledDraftRestoreRef.current) {
      return;
    }

    const isUntouched = (): boolean =>
      isUntouchedBuilderState(latestBuilderStateRef.current, initialBuilderStateRef.current);

    const decision = decideBuilderDraftRestore({
      startedOnBuilderRoute: startedOnBuilderRouteRef.current,
      isBuilderUntouched: isUntouched(),
      isAuthLoading,
      draft: loadBuilderDraft(),
    });

    if (decision.action === 'wait') {
      return;
    }

    if (decision.action === 'skip') {
      hasSettledDraftRestoreRef.current = true;
      return;
    }

    const { draft } = decision;
    if (!draft.activeSavedRecipeId) {
      hasSettledDraftRestoreRef.current = true;
      applyRestoredState(resolveRestoredDraftState(draft, null));
      return;
    }

    // Looking up the linked saved recipe is async. It only counts as settled once it finishes, so a cancelled
    // run (StrictMode re-run, or the signed-in user changing mid-lookup) is simply started again.
    let isCancelled = false;
    const linkedRecipeId = draft.activeSavedRecipeId;
    void (async () => {
      let savedRecipe: SavedRecipe | null = null;
      try {
        savedRecipe = await fetchSavedRecipe(linkedRecipeId);
      } catch {
        // Unreachable counts as missing: keep the work, drop the link.
      }

      // The baker may have started editing while the lookup ran. Their edit wins over the stored draft.
      if (isCancelled) {
        return;
      }

      hasSettledDraftRestoreRef.current = true;
      if (!isUntouched()) {
        return;
      }

      applyRestoredState(resolveRestoredDraftState(draft, savedRecipe));
    })();

    return () => {
      isCancelled = true;
    };
  }, [applyRestoredState, fetchSavedRecipe, isAuthLoading]);

  const resetToWelcome = useCallback((): void => {
    setEditingFromResults(false);
  }, []);

  const restoreToDefaults = useCallback((): void => {
    clearBuilderDraft();
    setRecipeInput(defaultRecipeInput);
    setScheduleInput(createDefaultScheduleInput(defaultRecipeInput));
    setActiveSavedRecipeId(null);
    setActiveSavedRecipe(null);
    setHasCompletedWizard(false);
    setHasOpenedSchedule(false);
  }, [setActiveSavedRecipe, setActiveSavedRecipeId]);

  const restoreFromSavedRecipe = useCallback((saved: SavedRecipe): void => {
    setRecipeInput(saved.recipeInput);
    setScheduleInput(
      saved.scheduleInput
        ? withoutCalendarDate(saved.scheduleInput)
        : createDefaultScheduleInput(saved.recipeInput),
    );
    setHasOpenedSchedule(Boolean(saved.scheduleInput));
    setHasCompletedWizard(true);
  }, []);

  const startNewRecipe = useCallback((): void => {
    restoreToDefaults();
    setEditingFromResults(false);
    refreshDraftSummary();
    routes.toWizardStep('doughSize');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [refreshDraftSummary, restoreToDefaults, routes]);

  const resumeDraft = useCallback(async (): Promise<void> => {
    const draft = loadBuilderDraft();
    if (!draft) {
      refreshDraftSummary();
      return;
    }

    let savedRecipe: SavedRecipe | null = null;
    if (draft.activeSavedRecipeId) {
      savedRecipe = await fetchSavedRecipe(draft.activeSavedRecipeId);
    }

    applyRestoredState(resolveRestoredDraftState(draft, savedRecipe));
    routes.toPath(buildAppPathFromDraft(draft));
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [applyRestoredState, fetchSavedRecipe, refreshDraftSummary, routes]);

  const loadSavedRecipe = useCallback(
    (saved: SavedRecipe): void => {
      setRecipeInput(saved.recipeInput);
      setScheduleInput(
        saved.scheduleInput
          ? withoutCalendarDate(normalizeScheduleInput(saved.scheduleInput, saved.recipeInput))
          : createDefaultScheduleInput(saved.recipeInput),
      );
      setActiveSavedRecipeId(saved.id);
      setActiveSavedRecipe(saved);
      setHasCompletedWizard(true);
      setEditingFromResults(false);
      setHasOpenedSchedule(Boolean(saved.scheduleInput));
      routes.toSummary();
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    },
    [routes, setActiveSavedRecipe, setActiveSavedRecipeId],
  );

  const loadTemplate = useCallback(
    (templateId: string): void => {
      const template = getRecipeTemplate(templateId);
      if (!template) {
        return;
      }

      const nextRecipeInput = cloneTemplateRecipeInput(template);
      setRecipeInput(nextRecipeInput);
      setScheduleInput(createDefaultScheduleInput(nextRecipeInput));
      setActiveSavedRecipeId(null);
      setActiveSavedRecipe(null);
      setHasCompletedWizard(false);
      setEditingFromResults(false);
      setHasOpenedSchedule(false);
      routes.toWizardStep('doughSize');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    },
    [routes, setActiveSavedRecipe, setActiveSavedRecipeId],
  );

  const goToStep = useCallback(
    (step: RecipeBuilderStep): void => {
      setEditingFromResults(false);
      if (isInputWizardStep(step)) {
        routes.toWizardStep(step);
      }
    },
    [routes],
  );

  const goToStepFromResults = useCallback(
    (step: RecipeBuilderStep): void => {
      setEditingFromResults(true);
      if (isInputWizardStep(step)) {
        routes.toWizardStep(step);
      }
    },
    [routes],
  );

  const returnToSummary = useCallback((): void => {
    setEditingFromResults(false);
    routes.toSummary();
  }, [routes]);

  const goBack = useCallback((): void => {
    const previousStep = getPreviousStep(routeStep);
    if (previousStep && isInputWizardStep(previousStep)) {
      routes.toWizardStep(previousStep);
      return;
    }

    if (previousStep === 'welcome') {
      routes.toHome();
    }
  }, [routeStep, routes]);

  const goContinue = useCallback((): void => {
    if (isLastWizardStep) {
      setHasCompletedWizard(true);
      setEditingFromResults(false);
      routes.toSummary();
      return;
    }

    const nextStep = getNextStep(routeStep);
    if (nextStep && isInputWizardStep(nextStep)) {
      routes.toWizardStep(nextStep);
    }
  }, [isLastWizardStep, routeStep, routes]);

  const openScheduleBuilder = useCallback((): void => {
    setScheduleInput((current) =>
      hasOpenedSchedule ? current : createDefaultScheduleInput(recipeInput),
    );
    setHasOpenedSchedule(true);
    routes.toSchedule();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [hasOpenedSchedule, recipeInput, routes]);

  const updateSchedule = useCallback(
    (patch: Partial<ScheduleInput>): void => {
      setScheduleInput((current) => normalizeScheduleInput({ ...current, ...patch }, recipeInput));
    },
    [recipeInput],
  );

  const updateNumberField = useCallback((field: WizardNumberField, value: number): void => {
    let nextInput: RecipeInput | undefined;

    setRecipeInput((currentInput) => {
      nextInput = { ...currentInput, [field]: value };
      return nextInput;
    });

    // While a size field is cleared or at 0, there is no per-loaf weight to scale the bake from.
    const canScaleBake =
      nextInput !== undefined &&
      Number.isFinite(nextInput.finalDoughWeightGrams) &&
      Number.isFinite(nextInput.numberOfLoaves) &&
      nextInput.numberOfLoaves > 0;

    if ((field === 'finalDoughWeightGrams' || field === 'numberOfLoaves') && canScaleBake) {
      setScheduleInput((currentSchedule) =>
        scaleScheduleBakeParamsForDoughSize(nextInput!, currentSchedule),
      );
    }
  }, []);

  const updateFlourType = useCallback((entryId: string, flourType: FlourType): void => {
    setRecipeInput((currentInput) => {
      const nextFlours = setFlourTypeInBlend(currentInput.doughFlours, entryId, flourType);
      const primaryFlour = getPrimaryFlourType(nextFlours);

      return {
        ...currentInput,
        doughFlours: nextFlours,
        levainFlourType:
          currentInput.levainFlourType === getPrimaryFlourType(currentInput.doughFlours)
            ? primaryFlour
            : currentInput.levainFlourType,
      };
    });
  }, []);

  const updateFlourPercent = useCallback((entryId: string, percent: number): void => {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      doughFlours: setFlourPercentInBlend(currentInput.doughFlours, entryId, percent),
    }));
  }, []);

  const updateFlourPercentStep = useCallback((entryId: string, delta: number): void => {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      doughFlours: stepFlourPercent(currentInput.doughFlours, entryId, delta),
    }));
  }, []);

  const handleAddFlour = useCallback((): void => {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      doughFlours: addFlourEntry(currentInput.doughFlours),
    }));
  }, []);

  const handleRemoveFlour = useCallback((entryId: string): void => {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      doughFlours: removeFlourEntry(currentInput.doughFlours, entryId),
    }));
  }, []);

  const updateLevainFlourType = useCallback((flourType: FlourType): void => {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      levainFlourType: flourType,
    }));
  }, []);

  const updateLevainType = useCallback((levainType: LevainType): void => {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      levainType,
      levainHydrationPercent: getLevainHydrationForType(levainType, currentInput.levainHydrationPercent),
    }));
  }, []);

  const updateLevainActivity = useCallback((levainActivity: LevainActivity): void => {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      levainActivity,
    }));
  }, []);

  const updateLevainHydration = useCallback(
    (value: number): void => {
      updateNumberField('levainHydrationPercent', value);
    },
    [updateNumberField],
  );

  return {
    hasCompletedWizard,
    editingFromResults,
    hasOpenedSchedule,
    recipeInput,
    scheduleInput,
    draftSummary,
    validationIssues,
    formula,
    assessmentSections,
    canGoBack,
    canContinue,
    isLastWizardStep,
    showReturnToSummary,
    refreshDraftSummary,
    resetToWelcome,
    restoreToDefaults,
    restoreFromSavedRecipe,
    startNewRecipe,
    resumeDraft,
    loadSavedRecipe,
    loadTemplate,
    goToStep,
    goToStepFromResults,
    returnToSummary,
    goBack,
    goContinue,
    openScheduleBuilder,
    updateSchedule,
    updateNumberField,
    updateFlourType,
    updateFlourPercent,
    updateFlourPercentStep,
    handleAddFlour,
    handleRemoveFlour,
    updateLevainFlourType,
    updateLevainType,
    updateLevainActivity,
    updateLevainHydration,
  };
}
