import { useEffect, useMemo, useState } from 'react';

import { AppHeader } from '../../components/AppHeader.tsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { SaveRecipeDialog } from '../../components/SaveRecipeDialog.tsx';
import { StepLayout } from '../../components/StepLayout.tsx';
import { UnsavedChangesDialog } from '../../components/UnsavedChangesDialog.tsx';
import { useAuth } from '../../lib/auth/useAuth.ts';
import { isAuthPromptDismissed, setAuthPromptDismissed } from '../../lib/auth/authPromptStorage.ts';
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
import { isRecipeDirty } from '../../lib/recipe/isRecipeDirty.ts';
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
  deleteSavedRecipe,
  duplicateSavedRecipe,
  generateDefaultRecipeName,
  getSavedRecipe,
  listSavedRecipeSummaries,
  upsertSavedRecipe,
} from '../../lib/storage/recipeStorage.ts';
import { importLocalRecipesIfNeeded } from '../../lib/storage/importLocalRecipes.ts';
import {
  deleteRemoteSavedRecipe,
  duplicateRemoteSavedRecipe,
  getRemoteSavedRecipe,
  listRemoteRecipeSummaries,
  upsertRemoteSavedRecipe,
} from '../../lib/storage/remoteRecipeStorage.ts';
import type { SavedRecipe, SavedRecipeSummary } from '../../lib/storage/types.ts';
import {
  clearBuilderDraft,
  getBuilderDraftSummary,
  loadBuilderDraft,
  saveBuilderDraft,
  type BuilderDraftSummary,
} from '../../lib/storage/draftStorage.ts';
import { ScheduleBuilderView } from '../schedule-builder/ScheduleBuilderView.tsx';
import { DoughSizeSection } from './DoughSizeSection.tsx';
import type { DoughSizeNumberField } from './DoughSizeSection.tsx';
import { FermentationSection } from './FermentationSection.tsx';
import type { FermentationNumberField } from './FermentationSection.tsx';
import { FlourSection } from './FlourSection.tsx';
import { RecipeResultsView } from './RecipeResultsView.tsx';
import { RecipeTargetsSection } from './RecipeTargetsSection.tsx';
import type { RecipeTargetsNumberField } from './RecipeTargetsSection.tsx';
import {
  getNextStep,
  getPreviousStep,
  hasBlockingIssuesForStep,
  type RecipeBuilderStep,
} from './recipeBuilderSteps.ts';
import { WelcomeStep } from './steps/WelcomeStep.tsx';
import { AuthModal } from '../auth/AuthModal.tsx';
import { CompanionView } from '../companion/CompanionView.tsx';
import { createBakeSession } from '../../lib/companion/bakeSession.ts';
import type { BakeSession } from '../../lib/companion/types.ts';
import {
  clearBakeSession,
  loadBakeSession,
  saveBakeSession,
} from '../../lib/storage/bakeSessionStorage.ts';

type BuilderPhase = 'wizard' | 'results' | 'schedule' | 'companion';

type NumberFieldName = DoughSizeNumberField | RecipeTargetsNumberField | FermentationNumberField;

type SaveDialogSource = 'results' | 'schedule';

export function RecipeBuilder() {
  const { user, isConfigured, isLoading: isAuthLoading } = useAuth();
  const useCloudRecipes = Boolean(user && isConfigured);
  const [phase, setPhase] = useState<BuilderPhase>('wizard');
  const [currentStep, setCurrentStep] = useState<RecipeBuilderStep>('welcome');
  const [hasCompletedWizard, setHasCompletedWizard] = useState(false);
  const [editingFromResults, setEditingFromResults] = useState(false);
  const [hasOpenedSchedule, setHasOpenedSchedule] = useState(false);
  const [recipeInput, setRecipeInput] = useState<RecipeInput>(defaultRecipeInput);
  const [scheduleInput, setScheduleInput] = useState<ScheduleInput>(() =>
    createDefaultScheduleInput(defaultRecipeInput),
  );
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipeSummary[]>([]);
  const [activeSavedRecipeId, setActiveSavedRecipeId] = useState<string | null>(null);
  const [activeSavedRecipe, setActiveSavedRecipe] = useState<SavedRecipe | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveDialogSource, setSaveDialogSource] = useState<SaveDialogSource>('results');
  const [pendingDeleteRecipeId, setPendingDeleteRecipeId] = useState<string | null>(null);
  const [draftSummary, setDraftSummary] = useState<BuilderDraftSummary | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [recipeImportMessage, setRecipeImportMessage] = useState<string | null>(null);
  const [bakeSession, setBakeSession] = useState<BakeSession | null>(null);
  const [resumableBakeSession, setResumableBakeSession] = useState<BakeSession | null>(() => loadBakeSession());
  const [isStartingBake, setIsStartingBake] = useState(false);
  const [isUnsavedDialogOpen, setIsUnsavedDialogOpen] = useState(false);
  const [pendingGoHomeAfterSave, setPendingGoHomeAfterSave] = useState(false);

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
  const saveDialogSchedule = hasOpenedSchedule || saveDialogSource === 'schedule'
    ? scheduleInput
    : createDefaultScheduleInput(recipeInput);
  const saveDialogDefaultName =
    activeSavedRecipe?.name ?? generateDefaultRecipeName(recipeInput, saveDialogSchedule);
  const pendingDeleteRecipe = savedRecipes.find((recipe) => recipe.id === pendingDeleteRecipeId);
  const showHomeButton = phase !== 'wizard' || currentStep !== 'welcome';

  useEffect(() => {
    void loadSavedRecipes();
    setDraftSummary(getBuilderDraftSummary());
  }, [useCloudRecipes, user?.id]);

  useEffect(() => {
    if (!recipeImportMessage) {
      return;
    }

    const timer = window.setTimeout(() => setRecipeImportMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [recipeImportMessage]);

  useEffect(() => {
    if (currentStep !== 'welcome' || phase !== 'wizard' || user || !isConfigured || isAuthLoading) {
      return;
    }

    if (!isAuthPromptDismissed()) {
      setIsAuthModalOpen(true);
    }
  }, [currentStep, phase, user, isConfigured, isAuthLoading]);

  useEffect(() => {
    if (phase === 'companion') {
      return;
    }

    saveBuilderDraft({
      phase,
      currentStep,
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
    currentStep,
    hasCompletedWizard,
    editingFromResults,
    hasOpenedSchedule,
    recipeInput,
    scheduleInput,
    activeSavedRecipeId,
  ]);

  function refreshDraftSummary(): void {
    setDraftSummary(getBuilderDraftSummary());
  }

  function closeAuthModal(dismissed: boolean): void {
    if (dismissed) {
      setAuthPromptDismissed(true);
    }

    setIsAuthModalOpen(false);
  }

  function openAuthModal(): void {
    setIsAuthModalOpen(true);
  }

  async function loadSavedRecipes(): Promise<void> {
    if (useCloudRecipes && user) {
      try {
        const { imported } = await importLocalRecipesIfNeeded(user.id);
        if (imported > 0) {
          setRecipeImportMessage(
            imported === 1
              ? 'Imported 1 recipe from this device.'
              : `Imported ${imported} recipes from this device.`,
          );
        }

        setSavedRecipes(await listRemoteRecipeSummaries(user.id));
      } catch {
        setSavedRecipes([]);
      }
      return;
    }

    setSavedRecipes(listSavedRecipeSummaries());
  }

  async function refreshSavedRecipes(): Promise<void> {
    await loadSavedRecipes();
  }

  async function fetchSavedRecipe(id: string): Promise<SavedRecipe | null> {
    if (useCloudRecipes && user) {
      return getRemoteSavedRecipe(user.id, id);
    }

    return getSavedRecipe(id);
  }

  function startNewRecipe(): void {
    clearBuilderDraft();
    setRecipeInput(defaultRecipeInput);
    setScheduleInput(createDefaultScheduleInput(defaultRecipeInput));
    setActiveSavedRecipeId(null);
    setActiveSavedRecipe(null);
    setHasCompletedWizard(false);
    setEditingFromResults(false);
    setHasOpenedSchedule(false);
    setPhase('wizard');
    setCurrentStep('doughSize');
    refreshDraftSummary();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  function resumeDraft(): void {
    const draft = loadBuilderDraft();
    if (!draft) {
      refreshDraftSummary();
      return;
    }

    setRecipeInput(draft.recipeInput);
    setScheduleInput(draft.scheduleInput);
    setActiveSavedRecipeId(draft.activeSavedRecipeId);
    setActiveSavedRecipe(null);
    setHasCompletedWizard(draft.hasCompletedWizard);
    setEditingFromResults(draft.editingFromResults);
    setHasOpenedSchedule(draft.hasOpenedSchedule);
    setPhase(draft.phase);
    setCurrentStep(draft.currentStep);

    if (draft.activeSavedRecipeId) {
      void fetchSavedRecipe(draft.activeSavedRecipeId).then((saved) => {
        if (saved) {
          setActiveSavedRecipe(saved);
        }
      });
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  async function loadSavedRecipe(id: string): Promise<void> {
    const saved = await fetchSavedRecipe(id);
    if (!saved) {
      await refreshSavedRecipes();
      return;
    }

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
    setPhase('results');
    setCurrentStep('fermentation');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  async function handleDuplicateRecipe(id: string): Promise<void> {
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
  }

  function refreshResumableBakeSession(): void {
    setResumableBakeSession(loadBakeSession());
  }

  function performGoHome(): void {
    setPhase('wizard');
    setCurrentStep('welcome');
    setEditingFromResults(false);
    setIsSaveDialogOpen(false);
    setPendingDeleteRecipeId(null);
    setIsUnsavedDialogOpen(false);
    setPendingGoHomeAfterSave(false);
    setBakeSession(null);
    refreshDraftSummary();
    refreshResumableBakeSession();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  function goHome(): void {
    if (phase === 'companion') {
      if (bakeSession) {
        saveBakeSession(bakeSession);
        setResumableBakeSession(bakeSession);
      }

      setBakeSession(null);
      performGoHome();
      return;
    }

    if (
      isRecipeDirty({
        phase,
        currentStep,
        recipeInput,
        scheduleInput,
        hasOpenedSchedule,
        hasCompletedWizard,
        activeSavedRecipe,
      })
    ) {
      setIsUnsavedDialogOpen(true);
      return;
    }

    performGoHome();
  }

  function discardUnsavedChanges(): void {
    if (activeSavedRecipe) {
      setRecipeInput(activeSavedRecipe.recipeInput);
      setScheduleInput(
        activeSavedRecipe.scheduleInput ?? createDefaultScheduleInput(activeSavedRecipe.recipeInput),
      );
      setHasOpenedSchedule(Boolean(activeSavedRecipe.scheduleInput));
      setHasCompletedWizard(true);
    } else {
      clearBuilderDraft();
      setRecipeInput(defaultRecipeInput);
      setScheduleInput(createDefaultScheduleInput(defaultRecipeInput));
      setActiveSavedRecipeId(null);
      setActiveSavedRecipe(null);
      setHasCompletedWizard(false);
      setHasOpenedSchedule(false);
    }

    performGoHome();
  }

  function saveBeforeLeavingHome(): void {
    setIsUnsavedDialogOpen(false);

    if (activeSavedRecipeId && activeSavedRecipe) {
      void persistRecipe(
        activeSavedRecipe.name,
        hasOpenedSchedule || saveDialogSource === 'schedule',
      ).then(() => {
        performGoHome();
      });
      return;
    }

    setPendingGoHomeAfterSave(true);
    setSaveDialogSource(hasOpenedSchedule ? 'schedule' : 'results');
    setIsSaveDialogOpen(true);
  }

  function loadTemplate(templateId: string): void {
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
    setPhase('wizard');
    setCurrentStep('doughSize');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  function requestDeleteRecipe(id: string): void {
    setPendingDeleteRecipeId(id);
  }

  async function confirmDeleteRecipe(): Promise<void> {
    if (!pendingDeleteRecipeId) {
      return;
    }

    await handleDeleteRecipe(pendingDeleteRecipeId);
    setPendingDeleteRecipeId(null);
  }

  async function handleDeleteRecipe(id: string): Promise<void> {
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
  }

  function openSaveDialog(source: SaveDialogSource): void {
    setSaveDialogSource(source);
    setIsSaveDialogOpen(true);
  }

  async function persistRecipe(name: string, includeSchedule: boolean): Promise<SavedRecipe> {
    const payload = {
      id: activeSavedRecipeId ?? undefined,
      name,
      recipeInput,
      scheduleInput: includeSchedule ? scheduleInput : undefined,
    };

    const saved =
      useCloudRecipes && user
        ? await upsertRemoteSavedRecipe(user.id, payload)
        : upsertSavedRecipe(payload);

    setActiveSavedRecipeId(saved.id);
    setActiveSavedRecipe(saved);
    await refreshSavedRecipes();
    return saved;
  }

  async function confirmSaveRecipe(name: string): Promise<void> {
    await persistRecipe(
      name,
      saveDialogSource === 'schedule' || hasOpenedSchedule,
    );
    setIsSaveDialogOpen(false);

    if (pendingGoHomeAfterSave) {
      performGoHome();
    }
  }

  async function ensureRecipeSaved(): Promise<SavedRecipe> {
    return persistRecipe(
      activeSavedRecipe?.name ?? generateDefaultRecipeName(recipeInput, scheduleInput),
      true,
    );
  }

  function beginBakeSession(options: {
    savedRecipeId: string | null;
    recipeName: string;
    recipe: RecipeInput;
    schedule: ScheduleInput;
  }): void {
    const session = createBakeSession({
      savedRecipeId: options.savedRecipeId,
      recipeName: options.recipeName,
      recipeInput: options.recipe,
      scheduleInput: options.schedule,
    });

    saveBakeSession(session);
    setBakeSession(session);
    setResumableBakeSession(session);
    setPhase('companion');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  function resumeBakeSession(): void {
    const session = loadBakeSession();
    if (!session) {
      refreshResumableBakeSession();
      return;
    }

    setBakeSession(session);
    setPhase('companion');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  async function startBakeFromSchedule(): Promise<void> {
    setIsStartingBake(true);

    try {
      const saved = await ensureRecipeSaved();
      beginBakeSession({
        savedRecipeId: saved.id,
        recipeName: saved.name,
        recipe: saved.recipeInput,
        schedule: saved.scheduleInput ?? scheduleInput,
      });
    } finally {
      setIsStartingBake(false);
    }
  }

  async function startBakeFromSavedRecipe(id: string): Promise<void> {
    const saved = await fetchSavedRecipe(id);
    if (!saved?.scheduleInput) {
      return;
    }

    beginBakeSession({
      savedRecipeId: saved.id,
      recipeName: saved.name,
      recipe: saved.recipeInput,
      schedule: saved.scheduleInput,
    });
  }

  function updateBakeSession(session: BakeSession): void {
    saveBakeSession(session);
    setBakeSession(session);
  }

  function exitCompanion(options: { finished: boolean }): void {
    if (options.finished) {
      clearBakeSession();
      setResumableBakeSession(null);
    } else if (bakeSession) {
      saveBakeSession(bakeSession);
      setResumableBakeSession(bakeSession);
    }

    setBakeSession(null);
    performGoHome();
  }

  function goToStep(step: RecipeBuilderStep): void {
    setPhase('wizard');
    setCurrentStep(step);
    setEditingFromResults(false);
  }

  function goToStepFromResults(step: RecipeBuilderStep): void {
    setPhase('wizard');
    setCurrentStep(step);
    setEditingFromResults(true);
  }

  function returnToSummary(): void {
    setPhase('results');
    setEditingFromResults(false);
  }

  function openScheduleBuilder(): void {
    setScheduleInput((current) =>
      hasOpenedSchedule ? current : createDefaultScheduleInput(recipeInput),
    );
    setHasOpenedSchedule(true);
    setPhase('schedule');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  function updateSchedule(patch: Partial<ScheduleInput>): void {
    setScheduleInput((current) => normalizeScheduleInput({ ...current, ...patch }, recipeInput));
  }

  const unsavedDialog = isUnsavedDialogOpen ? (
    <UnsavedChangesDialog
      onCancel={() => setIsUnsavedDialogOpen(false)}
      onDiscard={discardUnsavedChanges}
      onSave={saveBeforeLeavingHome}
    />
  ) : null;

  const saveDialog = isSaveDialogOpen ? (
    <SaveRecipeDialog
      defaultName={saveDialogDefaultName}
      title={activeSavedRecipeId ? 'Update saved recipe' : 'Save recipe'}
      submitLabel={activeSavedRecipeId ? 'Update recipe' : 'Save recipe'}
      onCancel={() => {
        setIsSaveDialogOpen(false);
        setPendingGoHomeAfterSave(false);
      }}
      onSave={(name) => void confirmSaveRecipe(name)}
    />
  ) : null;

  const deleteDialog = pendingDeleteRecipe ? (
    <ConfirmDialog
      title="Delete saved recipe?"
      message={`"${pendingDeleteRecipe.name}" will be removed${useCloudRecipes ? ' from your account' : ' from this device'}.`}
      confirmLabel="Delete recipe"
      onCancel={() => setPendingDeleteRecipeId(null)}
      onConfirm={() => void confirmDeleteRecipe()}
    />
  ) : null;

  const homeHeader = showHomeButton ? <AppHeader onHome={goHome} /> : null;

  if (phase === 'companion' && bakeSession) {
    return (
      <>
        {homeHeader}
        <CompanionView
          session={bakeSession}
          onSessionChange={updateBakeSession}
          onExit={(finished) => exitCompanion({ finished })}
        />
        {unsavedDialog}
      </>
    );
  }

  if (phase === 'schedule') {
    return (
      <>
        {homeHeader}
        <ScheduleBuilderView
          recipeInput={recipeInput}
          scheduleInput={scheduleInput}
          recipeName={activeSavedRecipe?.name ?? generateDefaultRecipeName(recipeInput, scheduleInput)}
          onScheduleChange={updateSchedule}
          onBack={() => setPhase('results')}
          onSave={() => openSaveDialog('schedule')}
          onStartBake={() => void startBakeFromSchedule()}
          isStartingBake={isStartingBake}
        />
        {saveDialog}
        {deleteDialog}
        {unsavedDialog}
      </>
    );
  }

  if (phase === 'results') {
    return (
      <>
        {homeHeader}
        <RecipeResultsView
          recipeInput={recipeInput}
          formula={formula}
          assessmentSections={assessmentSections}
          onEditStep={goToStepFromResults}
          onBuildSchedule={openScheduleBuilder}
          onSave={() => openSaveDialog('results')}
          isSavedRecipe={Boolean(activeSavedRecipeId)}
        />
        {saveDialog}
        {deleteDialog}
        {unsavedDialog}
      </>
    );
  }

  if (currentStep === 'welcome') {
    return (
      <>
        <WelcomeStep
          savedRecipes={savedRecipes}
          draftSummary={draftSummary}
          resumableBakeSession={resumableBakeSession}
          importMessage={recipeImportMessage}
          onStart={startNewRecipe}
          onResumeDraft={resumeDraft}
          onResumeBake={resumeBakeSession}
          onLoadTemplate={loadTemplate}
          onLoadRecipe={(id) => void loadSavedRecipe(id)}
          onDuplicateRecipe={(id) => void handleDuplicateRecipe(id)}
          onDeleteRecipe={requestDeleteRecipe}
          onOpenAuth={openAuthModal}
          onStartBake={(id) => void startBakeFromSavedRecipe(id)}
        />
        {isAuthModalOpen ? <AuthModal onClose={closeAuthModal} /> : null}
        {saveDialog}
        {deleteDialog}
        {unsavedDialog}
      </>
    );
  }

  const canGoBack = getPreviousStep(currentStep) !== null;
  const canContinue = !hasBlockingIssuesForStep(validationIssues, currentStep);
  const isLastWizardStep = currentStep === 'fermentation';
  const showReturnToSummary = hasCompletedWizard && editingFromResults;

  function goBack(): void {
    const previousStep = getPreviousStep(currentStep);
    if (previousStep) {
      setCurrentStep(previousStep);
    }
  }

  function goContinue(): void {
    if (isLastWizardStep) {
      setHasCompletedWizard(true);
      setEditingFromResults(false);
      setPhase('results');
      return;
    }

    const nextStep = getNextStep(currentStep);
    if (nextStep) {
      setCurrentStep(nextStep);
    }
  }

  function updateNumberField(field: NumberFieldName, value: number): void {
    setRecipeInput((currentInput) => {
      const nextInput = {
        ...currentInput,
        [field]: value,
      };

      if (field === 'finalDoughWeightGrams' || field === 'numberOfLoaves') {
        setScheduleInput((currentSchedule) =>
          scaleScheduleBakeParamsForDoughSize(nextInput, currentSchedule),
        );
      }

      return nextInput;
    });
  }

  function updateFlourType(entryId: string, flourType: FlourType): void {
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
  }

  function updateFlourPercent(entryId: string, percent: number): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      doughFlours: setFlourPercentInBlend(currentInput.doughFlours, entryId, percent),
    }));
  }

  function updateFlourPercentStep(entryId: string, delta: number): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      doughFlours: stepFlourPercent(currentInput.doughFlours, entryId, delta),
    }));
  }

  function handleAddFlour(): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      doughFlours: addFlourEntry(currentInput.doughFlours),
    }));
  }

  function handleRemoveFlour(entryId: string): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      doughFlours: removeFlourEntry(currentInput.doughFlours, entryId),
    }));
  }

  function updateLevainFlourType(flourType: FlourType): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      levainFlourType: flourType,
    }));
  }

  function updateLevainType(levainType: LevainType): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      levainType,
      levainHydrationPercent: getLevainHydrationForType(levainType, currentInput.levainHydrationPercent),
    }));
  }

  function updateLevainActivity(levainActivity: LevainActivity): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      levainActivity,
    }));
  }

  function updateLevainHydration(value: number): void {
    updateNumberField('levainHydrationPercent', value);
  }

  return (
    <>
      {homeHeader}
      <StepLayout
        currentStep={currentStep}
        canGoBack={canGoBack}
        canContinue={canContinue}
        continueLabel={isLastWizardStep ? 'View ingredient summary' : 'Continue'}
        showSaveToSummary={showReturnToSummary}
        onBack={goBack}
        onContinue={goContinue}
        onSaveToSummary={showReturnToSummary ? returnToSummary : undefined}
      >
        {currentStep === 'doughSize' ? (
          <DoughSizeSection
            recipeInput={recipeInput}
            validationIssues={validationIssues}
            onNumberChange={updateNumberField}
          />
        ) : null}
        {currentStep === 'flour' ? (
          <FlourSection
            recipeInput={recipeInput}
            validationIssues={validationIssues}
            onFlourTypeChange={updateFlourType}
            onFlourPercentChange={updateFlourPercent}
            onFlourPercentStep={updateFlourPercentStep}
            onAddFlour={handleAddFlour}
            onRemoveFlour={handleRemoveFlour}
            onEditDoughWeight={() => goToStep('doughSize')}
          />
        ) : null}
        {currentStep === 'recipeTargets' ? (
          <RecipeTargetsSection
            recipeInput={recipeInput}
            validationIssues={validationIssues}
            onNumberChange={updateNumberField}
          />
        ) : null}
        {currentStep === 'fermentation' ? (
          <FermentationSection
            recipeInput={recipeInput}
            validationIssues={validationIssues}
            onNumberChange={updateNumberField}
            onLevainActivityChange={updateLevainActivity}
            onLevainTypeChange={updateLevainType}
            onLevainHydrationChange={updateLevainHydration}
            onLevainFlourChange={updateLevainFlourType}
          />
        ) : null}
      </StepLayout>
      {saveDialog}
      {deleteDialog}
      {unsavedDialog}
    </>
  );
}
