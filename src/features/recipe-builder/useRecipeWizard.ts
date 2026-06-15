import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { hasBlockingValidationIssue, validateRecipeInput } from '../../lib/recipe/validation.ts';
import type {
  FlourType,
  LevainActivity,
  LevainType,
  RecipeInput,
} from '../../lib/recipe/types.ts';
import { createDefaultScheduleInput } from '../../lib/schedule/defaults.ts';
import { normalizeScheduleInput } from '../../lib/schedule/normalizeScheduleInput.ts';
import { scaleScheduleBakeParamsForDoughSize } from '../../lib/schedule/scaleScheduleBakeParams.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import {
  clearBuilderDraft,
  getBuilderDraftSummary,
  loadBuilderDraft,
  saveBuilderDraft,
  type BuilderDraftSummary,
} from '../../lib/storage/draftStorage.ts';
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
}: UseRecipeWizardOptions) {
  const [hasCompletedWizard, setHasCompletedWizard] = useState(false);
  const [editingFromResults, setEditingFromResults] = useState(false);
  const [hasOpenedSchedule, setHasOpenedSchedule] = useState(false);
  const [recipeInput, setRecipeInput] = useState<RecipeInput>(defaultRecipeInput);
  const [scheduleInput, setScheduleInput] = useState<ScheduleInput>(() =>
    createDefaultScheduleInput(defaultRecipeInput),
  );
  const [draftSummary, setDraftSummary] = useState<BuilderDraftSummary | null>(null);

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
      saved.scheduleInput ?? createDefaultScheduleInput(saved.recipeInput),
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

    setRecipeInput(draft.recipeInput);
    setScheduleInput(draft.scheduleInput);
    setActiveSavedRecipeId(draft.activeSavedRecipeId);
    setActiveSavedRecipe(savedRecipe);
    setHasCompletedWizard(draft.hasCompletedWizard);
    setEditingFromResults(draft.editingFromResults);
    setHasOpenedSchedule(draft.hasOpenedSchedule);
    routes.toPath(buildAppPathFromDraft(draft));
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [fetchSavedRecipe, refreshDraftSummary, routes, setActiveSavedRecipe, setActiveSavedRecipeId]);

  const loadSavedRecipe = useCallback(
    (saved: SavedRecipe): void => {
      setRecipeInput(saved.recipeInput);
      setScheduleInput(
        saved.scheduleInput
          ? normalizeScheduleInput(saved.scheduleInput, saved.recipeInput)
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

    if (field === 'finalDoughWeightGrams' || field === 'numberOfLoaves') {
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
