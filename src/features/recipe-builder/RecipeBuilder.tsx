import { useCallback, useEffect, useMemo } from 'react';

import { AppHeader } from '../../components/AppHeader.tsx';
import { HomeIcon } from '../../components/icons.tsx';
import { useAuth } from '../../lib/auth/useAuth.ts';
import { useAuthPrompt } from '../../lib/auth/useAuthPrompt.ts';
import { generateDefaultRecipeName } from '../../lib/storage/recipeStorage.ts';
import { useSavedRecipes } from '../../lib/storage/useSavedRecipes.ts';
import type { SavedRecipe } from '../../lib/storage/types.ts';
import { createDefaultScheduleInput } from '../../lib/schedule/defaults.ts';
import { ScheduleBuilderView } from '../schedule-builder/ScheduleBuilderView.tsx';
import { RecipeResultsView } from './RecipeResultsView.tsx';
import { AuthModal } from '../auth/AuthModal.tsx';
import { CompanionView } from '../companion/CompanionView.tsx';
import { useBakeSession } from '../../lib/companion/useBakeSession.ts';
import { useBakeHistory } from '../../lib/history/useBakeHistory.ts';
import { resolveAppScreen, showWelcomeBottomNav } from './appLocation.ts';
import { RecipeBuilderDialogs } from './RecipeBuilderDialogs.tsx';
import { useAppNavigation } from './useAppLocation.ts';
import { useAppRouter } from './useAppRouter.ts';
import { useBakeFlow } from './useBakeFlow.ts';
import { useRecipeWizard } from './useRecipeWizard.ts';
import { WelcomeScreen } from './WelcomeScreen.tsx';
import { WizardInputSteps } from './WizardInputSteps.tsx';
import { isInputWizardStep } from './recipeBuilderSteps.ts';

export function RecipeBuilder() {
  const { user, isConfigured, isLoading: isAuthLoading } = useAuth();
  const { location, phase, tab, wizardStep, historyDetailId, routes, isKnownPath } = useAppRouter();

  useEffect(() => {
    if (!isKnownPath) {
      routes.toHome();
    }
  }, [isKnownPath, routes]);

  const {
    useCloudRecipes,
    savedRecipes,
    savedRecipesError,
    recipeImportMessage,
    activeSavedRecipeId,
    activeSavedRecipe,
    setActiveSavedRecipeId,
    setActiveSavedRecipe,
    loadSavedRecipes,
    fetchSavedRecipe,
    duplicateRecipe,
    deleteRecipe,
    persistRecipe,
  } = useSavedRecipes({ user, isConfigured });

  const wizard = useRecipeWizard({
    phase,
    routeStep: wizardStep,
    routes,
    activeSavedRecipeId,
    setActiveSavedRecipeId,
    setActiveSavedRecipe,
    fetchSavedRecipe,
    userId: user?.id,
    useCloudRecipes,
  });

  const { isAuthModalOpen, openAuthModal, closeAuthModal } = useAuthPrompt({
    user,
    isConfigured,
    isAuthLoading,
    shouldPrompt: phase === 'wizard' && wizard.currentStep === 'welcome' && tab === 'home',
  });

  const {
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
  } = useBakeHistory({
    user,
    isConfigured,
    mainTab: tab,
    historyDetailId,
    onRequireAuth: openAuthModal,
  });

  const handleBakeSavedToHistory = useCallback((): void => {
    void loadBakeHistory();
    routes.toHistory();
  }, [loadBakeHistory, routes]);

  const bakeSessionState = useBakeSession({
    user,
    onRequireAuth: openAuthModal,
    onBakeSavedToHistory: handleBakeSavedToHistory,
  });

  useEffect(() => {
    if (phase === 'companion' && !bakeSessionState.bakeSession) {
      routes.toHome();
    }
  }, [bakeSessionState.bakeSession, phase, routes]);

  const saveActiveRecipe = useCallback(
    async (name: string, includeSchedule: boolean): Promise<SavedRecipe> => {
      return persistRecipe({
        name,
        recipeInput: wizard.recipeInput,
        scheduleInput: wizard.scheduleInput,
        includeSchedule,
      });
    },
    [persistRecipe, wizard.recipeInput, wizard.scheduleInput],
  );

  const navigation = useAppNavigation({
    location,
    routes,
    wizard: {
      currentStep: wizard.currentStep,
      recipeInput: wizard.recipeInput,
      scheduleInput: wizard.scheduleInput,
      hasOpenedSchedule: wizard.hasOpenedSchedule,
      hasCompletedWizard: wizard.hasCompletedWizard,
    },
    activeSavedRecipe,
    activeSavedRecipeId,
    resetToWelcome: wizard.resetToWelcome,
    restoreFromSavedRecipe: wizard.restoreFromSavedRecipe,
    restoreToDefaults: wizard.restoreToDefaults,
    refreshDraftSummary: wizard.refreshDraftSummary,
    stashSessionOnLeaveCompanion: bakeSessionState.stashSessionOnLeaveCompanion,
    refreshResumableBakeSession: bakeSessionState.refreshResumableBakeSession,
    saveActiveRecipe,
  });

  const bakeFlow = useBakeFlow({
    activeSavedRecipeId,
    activeSavedRecipe,
    recipeInput: wizard.recipeInput,
    scheduleInput: wizard.scheduleInput,
    fetchSavedRecipe,
    saveActiveRecipe,
    enterCompanion: navigation.enterCompanion,
    performGoHome: navigation.performGoHome,
    openSaveDialog: navigation.openSaveDialog,
    setPendingStartBakeAfterSave: navigation.setPendingStartBakeAfterSave,
    bakeSession: {
      beginBakeSession: bakeSessionState.beginBakeSession,
      resumeBakeSession: bakeSessionState.resumeBakeSession,
      runStartBake: bakeSessionState.runStartBake,
      saveCompletedBakeToHistory: bakeSessionState.saveCompletedBake,
      clearSessionAfterFinish: bakeSessionState.clearSessionAfterFinish,
      stashSessionOnLeaveCompanion: bakeSessionState.stashSessionOnLeaveCompanion,
    },
  });

  const screen = useMemo(
    () => resolveAppScreen(location, wizard.currentStep, historyDetailId),
    [historyDetailId, location, wizard.currentStep],
  );

  const saveDialogSchedule =
    wizard.hasOpenedSchedule || navigation.saveDialogSource === 'schedule'
      ? wizard.scheduleInput
      : createDefaultScheduleInput(wizard.recipeInput);
  const saveDialogDefaultName =
    activeSavedRecipe?.name ?? generateDefaultRecipeName(wizard.recipeInput, saveDialogSchedule);
  const pendingDeleteRecipe = savedRecipes.find((recipe) => recipe.id === navigation.pendingDeleteRecipeId);

  const dialogs = (
    <RecipeBuilderDialogs
      isUnsavedDialogOpen={navigation.isUnsavedDialogOpen}
      onCancelUnsaved={navigation.setIsUnsavedDialogOpen}
      onDiscardUnsaved={navigation.discardUnsavedChanges}
      onSaveBeforeLeaving={navigation.saveBeforeLeavingHome}
      isSaveDialogOpen={navigation.isSaveDialogOpen}
      saveDialogDefaultName={saveDialogDefaultName}
      activeSavedRecipeId={activeSavedRecipeId}
      onCancelSave={navigation.closeSaveDialog}
      onConfirmSave={(name) => void confirmSaveRecipe(name)}
      pendingDeleteRecipe={pendingDeleteRecipe}
      useCloudRecipes={useCloudRecipes}
      onCancelDelete={navigation.clearPendingDeleteRecipe}
      onConfirmDelete={() => void confirmDeleteRecipe()}
    />
  );

  async function handleLoadSavedRecipe(id: string): Promise<void> {
    const saved = await fetchSavedRecipe(id);
    if (!saved) {
      await loadSavedRecipes();
      return;
    }

    wizard.loadSavedRecipe(saved);
  }

  async function confirmDeleteRecipe(): Promise<void> {
    if (!navigation.pendingDeleteRecipeId) {
      return;
    }

    await deleteRecipe(navigation.pendingDeleteRecipeId);
    navigation.clearPendingDeleteRecipe();
  }

  async function confirmSaveRecipe(name: string): Promise<void> {
    await saveActiveRecipe(
      name,
      navigation.saveDialogSource === 'schedule' || wizard.hasOpenedSchedule,
    );
    navigation.closeSaveDialog();
    await bakeFlow.continueAfterSaveRecipe({
      pendingGoHomeAfterSave: navigation.pendingGoHomeAfterSave,
      pendingStartBakeAfterSave: navigation.pendingStartBakeAfterSave,
    });
  }

  function handleOpenHistoryEntry(id: string): void {
    if (!user) {
      openAuthModal();
      return;
    }

    routes.toHistoryDetail(id);
  }

  async function handleDeleteHistoryDetail(): Promise<void> {
    await deleteHistoryDetail();
    routes.toHistory();
  }

  const homeHeader = navigation.showHomeButton ? <AppHeader onHome={navigation.goHome} /> : null;
  const wizardHomeAction = navigation.showHomeButton ? (
    <button type="button" className="app-header__home wizard-icon-button" onClick={navigation.goHome}>
      <HomeIcon />
      <span className="visually-hidden">Home</span>
    </button>
  ) : null;

  if (screen.kind === 'companion' && bakeSessionState.bakeSession) {
    return (
      <>
        {homeHeader}
        <CompanionView
          session={bakeSessionState.bakeSession}
          onSessionChange={bakeSessionState.updateBakeSession}
          onSaveBake={bakeFlow.saveCompletedBake}
          isSavingBake={bakeSessionState.isSavingBakeHistory}
          saveBakeError={bakeSessionState.saveBakeHistoryError}
          onExit={(finished) => bakeFlow.exitCompanion({ finished })}
        />
        {dialogs}
        {isAuthModalOpen ? <AuthModal onClose={closeAuthModal} /> : null}
      </>
    );
  }

  if (screen.kind === 'schedule') {
    return (
      <>
        {homeHeader}
        <ScheduleBuilderView
          recipeInput={wizard.recipeInput}
          scheduleInput={wizard.scheduleInput}
          recipeName={
            activeSavedRecipe?.name ??
            generateDefaultRecipeName(wizard.recipeInput, wizard.scheduleInput)
          }
          onScheduleChange={wizard.updateSchedule}
          onBack={navigation.returnToResults}
          onSave={() => navigation.openSaveDialog('schedule')}
          onStartBake={() => void bakeFlow.startBakeFromSchedule()}
          isStartingBake={bakeSessionState.isStartingBake}
        />
        {dialogs}
      </>
    );
  }

  if (screen.kind === 'results') {
    return (
      <>
        {homeHeader}
        <RecipeResultsView
          recipeInput={wizard.recipeInput}
          formula={wizard.formula}
          assessmentSections={wizard.assessmentSections}
          onEditStep={wizard.goToStepFromResults}
          onBuildSchedule={wizard.openScheduleBuilder}
          onSave={() => navigation.openSaveDialog('results')}
          isSavedRecipe={Boolean(activeSavedRecipeId)}
        />
        {dialogs}
      </>
    );
  }

  if (screen.kind === 'welcome') {
    return (
      <>
        <WelcomeScreen
          showBottomNav={showWelcomeBottomNav(screen)}
          mainTab={tab}
          onTabChange={navigation.handleMainTabChange}
          savedRecipes={savedRecipes}
          savedRecipesError={savedRecipesError}
          draftSummary={wizard.draftSummary}
          resumableBakeSession={bakeSessionState.resumableBakeSession}
          importMessage={recipeImportMessage}
          onStart={wizard.startNewRecipe}
          onResumeDraft={wizard.resumeDraft}
          onResumeBake={bakeFlow.handleResumeBake}
          onLoadTemplate={wizard.loadTemplate}
          onLoadRecipe={(id) => void handleLoadSavedRecipe(id)}
          onDuplicateRecipe={(id) => void duplicateRecipe(id)}
          onDeleteRecipe={navigation.requestDeleteRecipe}
          onOpenAuth={openAuthModal}
          onStartBake={(id) => void bakeFlow.startBakeFromSavedRecipe(id)}
          onRetrySavedRecipes={() => void loadSavedRecipes()}
          isSignedIn={Boolean(user)}
          bakeHistory={bakeHistory}
          bakeHistoryLoadError={bakeHistoryLoadError}
          historyDetailId={historyDetailId}
          isLoadingHistoryDetail={isLoadingHistoryDetail}
          activeHistorySession={activeHistorySession}
          isSavingHistoryDetail={isSavingHistoryDetail}
          historyDetailError={historyDetailError}
          historyDetailLoadError={historyDetailLoadError}
          onOpenHistoryEntry={handleOpenHistoryEntry}
          onRetryHistoryLoad={() => void loadBakeHistory()}
          onCloseHistoryDetail={() => routes.toHistory()}
          onUpdateHistoryDetail={updateHistoryDetail}
          onDeleteHistoryDetail={handleDeleteHistoryDetail}
        >
          {dialogs}
          {isAuthModalOpen ? <AuthModal onClose={closeAuthModal} /> : null}
        </WelcomeScreen>
      </>
    );
  }

  if (!isInputWizardStep(wizard.currentStep)) {
    return null;
  }

  return (
    <WizardInputSteps
      currentStep={wizard.currentStep}
      recipeInput={wizard.recipeInput}
      validationIssues={wizard.validationIssues}
      canGoBack={wizard.canGoBack}
      canContinue={wizard.canContinue}
      isLastWizardStep={wizard.isLastWizardStep}
      showReturnToSummary={wizard.showReturnToSummary}
      headerAction={wizardHomeAction}
      onBack={wizard.goBack}
      onContinue={wizard.goContinue}
      onReturnToSummary={wizard.returnToSummary}
      onNumberChange={wizard.updateNumberField}
      onFlourTypeChange={wizard.updateFlourType}
      onFlourPercentChange={wizard.updateFlourPercent}
      onFlourPercentStep={wizard.updateFlourPercentStep}
      onAddFlour={wizard.handleAddFlour}
      onRemoveFlour={wizard.handleRemoveFlour}
      onEditDoughWeight={() => wizard.goToStep('doughSize')}
      onLevainActivityChange={wizard.updateLevainActivity}
      onLevainTypeChange={wizard.updateLevainType}
      onLevainHydrationChange={wizard.updateLevainHydration}
      onLevainFlourChange={wizard.updateLevainFlourType}
    >
      {dialogs}
    </WizardInputSteps>
  );
}
