import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppHeader } from '../../components/AppHeader.tsx';
import { HomeIcon } from '../../components/icons.tsx';
import { Toast } from '../../components/Toast.tsx';
import { useAuth } from '../../lib/auth/useAuth.ts';
import { useAuthPrompt } from '../../lib/auth/useAuthPrompt.ts';
import { loadBakeSession } from '../../lib/storage/bakeSessionStorage.ts';
import { generateDefaultRecipeName } from '../../lib/storage/recipeStorage.ts';
import { useSavedRecipes } from '../../lib/storage/useSavedRecipes.ts';
import type { SavedRecipe } from '../../lib/storage/types.ts';
import { createDefaultScheduleInput } from '../../lib/schedule/defaults.ts';
import { ScheduleBuilderView } from '../schedule-builder/ScheduleBuilderView.tsx';
import { RecipeResultsView } from './RecipeResultsView.tsx';
import { AuthModal } from '../auth/AuthModal.tsx';
import { CompanionView } from '../companion/CompanionView.tsx';
import { RecipeView } from '../recipe-view/RecipeView.tsx';
import { useBakeSession } from '../../lib/companion/useBakeSession.ts';
import { buildRecipeBakeStats } from '../../lib/history/recipeBakeStats.ts';
import { useBakeHistory } from '../../lib/history/useBakeHistory.ts';
import { resolveAppScreen, showWelcomeBottomNav } from './appLocation.ts';
import { RecipeBuilderDialogs } from './RecipeBuilderDialogs.tsx';
import { useAppNavigation } from './useAppLocation.ts';
import { useAppRouter } from './useAppRouter.ts';
import { useBakeDeepLink } from '../../lib/companion/useBakeDeepLink.ts';
import { useBakeFlow } from './useBakeFlow.ts';
import { useRecipeWizard } from './useRecipeWizard.ts';
import { WelcomeScreen } from './WelcomeScreen.tsx';
import { WizardInputSteps } from './WizardInputSteps.tsx';
import { isInputWizardStep } from './recipeBuilderSteps.ts';
import { DevPanel } from '../dev/DevPanel.tsx';

export function RecipeBuilder() {
  const { user, isConfigured, isLoading: isAuthLoading, signOut } = useAuth();
  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const { location, phase, tab, wizardStep, historyDetailId, recipeViewId, routes, isKnownPath, pathname } =
    useAppRouter();

  useEffect(() => {
    if (!isKnownPath) {
      routes.toHome();
    }
  }, [isKnownPath, routes]);

  const {
    useCloudRecipes,
    savedRecipes,
    savedRecipesError,
    isSavedRecipesLoading,
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

  const { isAuthModalOpen, openAuthModal, closeAuthModal, offerAuthAfterSave } = useAuthPrompt({
    user,
    isConfigured,
    isAuthLoading,
    isOnHome: phase === 'wizard' && wizardStep === 'welcome' && tab === 'home' && !recipeViewId,
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
    photoVersion: historyPhotoVersion,
    changeHistoryPhoto,
    removeHistoryPhoto,
  } = useBakeHistory({
    user,
    isConfigured,
    mainTab: tab,
    historyDetailId,
  });

  const recipeBakeStats = useMemo(() => buildRecipeBakeStats(bakeHistory), [bakeHistory]);

  const handleBakeSavedToHistory = useCallback((): void => {
    void loadBakeHistory();
    routes.toHistory();
  }, [loadBakeHistory, routes]);

  const bakeSessionState = useBakeSession({
    user,
    onBakeSavedToHistory: handleBakeSavedToHistory,
  });

  const {
    bakeSession,
    resumableBakeSession,
    pendingOverwriteBakeName,
    isStartingBake,
    isSavingBakeHistory,
    saveBakeHistoryError,
    photoNotice,
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
  } = bakeSessionState;

  useEffect(() => {
    if (phase === 'companion' && !bakeSession) {
      if (loadBakeSession()) {
        resumeBakeSession();
      } else {
        routes.toHome();
      }
    }
  }, [bakeSession, phase, resumeBakeSession, routes]);

  const openBakeModeFromDeepLink = useCallback((): void => {
    if (bakeSession) {
      routes.toBake();
      return;
    }

    if (loadBakeSession()) {
      resumeBakeSession();
      routes.toBake();
    }
  }, [bakeSession, resumeBakeSession, routes]);

  useBakeDeepLink(openBakeModeFromDeepLink);

  const saveActiveRecipe = useCallback(
    async (
      name: string,
      includeSchedule: boolean,
      recipeId?: string | null,
    ): Promise<SavedRecipe> => {
      const saved = await persistRecipe({
        name,
        recipeInput: wizard.recipeInput,
        scheduleInput: wizard.scheduleInput,
        includeSchedule,
        recipeId,
      });
      offerAuthAfterSave();
      return saved;
    },
    [offerAuthAfterSave, persistRecipe, wizard.recipeInput, wizard.scheduleInput],
  );

  const navigation = useAppNavigation({
    pathname,
    location,
    routes,
    wizard: {
      currentStep: wizardStep,
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
    stashSessionOnLeaveCompanion,
    refreshResumableBakeSession,
    saveActiveRecipe,
  });

  const bakeFlow = useBakeFlow({
    activeSavedRecipeId,
    activeSavedRecipe,
    isDirty: navigation.isDirty,
    recipeInput: wizard.recipeInput,
    scheduleInput: wizard.scheduleInput,
    fetchSavedRecipe,
    saveActiveRecipe,
    enterCompanion: navigation.enterCompanion,
    performGoHome: navigation.performGoHome,
    openSaveDialog: navigation.openSaveDialog,
    setPendingStartBakeAfterSave: navigation.setPendingStartBakeAfterSave,
    bakeSession: {
      tryBeginBakeSession,
      confirmPendingBeginBakeSession,
      resumeBakeSession,
      runStartBake,
      saveCompletedBakeToHistory: saveCompletedBake,
      clearSessionAfterFinish,
      stashSessionOnLeaveCompanion,
    },
  });

  const screen = useMemo(
    () => resolveAppScreen(location, wizardStep, historyDetailId, recipeViewId),
    [historyDetailId, location, recipeViewId, wizardStep],
  );

  const saveDialogSchedule =
    wizard.hasOpenedSchedule || navigation.saveDialogSource === 'schedule'
      ? wizard.scheduleInput
      : createDefaultScheduleInput(wizard.recipeInput);
  const saveDialogDefaultName =
    activeSavedRecipe?.name ?? generateDefaultRecipeName(wizard.recipeInput, saveDialogSchedule);
  const pendingDeleteRecipe = savedRecipes.find((recipe) => recipe.id === navigation.pendingDeleteRecipeId);

  const devPanel = isDevPanelOpen ? (
    <DevPanel
      isSignedIn={Boolean(user)}
      onClose={() => setIsDevPanelOpen(false)}
      onSignOut={signOut}
    />
  ) : null;

  const dialogs = (
    <RecipeBuilderDialogs
      bakeStartRequest={bakeFlow.bakeStartRequest}
      isStartingBake={isStartingBake}
      onCancelBakeStart={bakeFlow.cancelBakeStart}
      onConfirmBakeStart={(choice) => void bakeFlow.confirmBakeStart(choice)}
      leaveDialogMode={navigation.leaveDialogMode}
      isSavingExistingRecipe={navigation.isSavingExistingRecipe}
      unsavedSaveError={navigation.unsavedSaveError}
      onCancelLeave={navigation.cancelLeaveDialog}
      onDiscardUnsaved={navigation.discardUnsavedChanges}
      onSaveBeforeLeaving={navigation.saveBeforeLeavingHome}
      onConfirmLeaveSave={(name, recipeId) => void confirmSaveRecipe(name, recipeId)}
      pendingOverwriteBakeName={pendingOverwriteBakeName}
      onCancelOverwriteBake={cancelPendingBeginBakeSession}
      onConfirmOverwriteBake={() => {
        confirmPendingBeginBakeSession();
        navigation.enterCompanion();
      }}
      isSaveDialogOpen={navigation.isSaveDialogOpen}
      saveDialogDefaultName={saveDialogDefaultName}
      activeSavedRecipeId={activeSavedRecipeId}
      savedRecipes={savedRecipes}
      onCancelSave={navigation.closeSaveDialog}
      onConfirmSave={(name, recipeId) => void confirmSaveRecipe(name, recipeId)}
      pendingDeleteRecipe={pendingDeleteRecipe}
      useCloudRecipes={useCloudRecipes}
      onCancelDelete={navigation.clearPendingDeleteRecipe}
      onConfirmDelete={() => void confirmDeleteRecipe()}
    />
  );

  async function confirmDeleteRecipe(): Promise<void> {
    if (!navigation.pendingDeleteRecipeId) {
      return;
    }

    await deleteRecipe(navigation.pendingDeleteRecipeId);
    navigation.clearPendingDeleteRecipe();
    // Deleting from the recipe view leaves a page that no longer exists; the list is the next stop.
    if (screen.kind === 'recipe') {
      routes.toSaved();
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }

  async function confirmSaveRecipe(name: string, recipeId: string | null): Promise<void> {
    const pendingGoHomeAfterSave = navigation.pendingGoHomeAfterSave;
    const pendingStartBakeAfterSave = navigation.pendingStartBakeAfterSave;

    await saveActiveRecipe(
      name,
      navigation.saveDialogSource === 'schedule' || wizard.hasOpenedSchedule,
      recipeId,
    );
    navigation.closeSaveDialog();
    await bakeFlow.continueAfterSaveRecipe({
      pendingGoHomeAfterSave,
      pendingStartBakeAfterSave,
    });
  }

  function handleOpenHistoryEntry(id: string): void {
    // History is local-first, so signed-out users open their on-device bakes too.
    routes.toHistoryDetail(id);
  }

  async function handleDeleteHistoryDetail(): Promise<void> {
    await deleteHistoryDetail();
    routes.toHistory();
  }

  const homeHeaderTitle =
    screen.kind === 'schedule'
      ? 'Schedule builder'
      : screen.kind === 'results'
        ? 'Ingredient summary'
        : screen.kind === 'companion'
          ? (bakeSession?.recipeName ?? 'Bake mode')
          : undefined;

  const homeHeader = navigation.showHomeButton ? (
    <AppHeader onHome={navigation.goHome} title={homeHeaderTitle} />
  ) : null;
  const wizardHomeAction = navigation.showHomeButton ? (
    <button type="button" className="app-header__home wizard-icon-button" onClick={navigation.goHome}>
      <HomeIcon />
      <span className="visually-hidden">Home</span>
    </button>
  ) : null;

  if (screen.kind === 'companion' && bakeSession) {
    return (
      <>
        {homeHeader}
        <CompanionView
          session={bakeSession}
          onSessionChange={updateBakeSession}
          onSaveBake={bakeFlow.saveCompletedBake}
          isSavingBake={isSavingBakeHistory}
          saveBakeError={saveBakeHistoryError}
          onExit={(discardBake) => bakeFlow.exitCompanion({ discardBake })}
          coachNeedsSignIn={isConfigured && !isAuthLoading && !user}
          onSignInForCoach={openAuthModal}
        />
        {dialogs}
        {devPanel}
        {isAuthModalOpen ? <AuthModal onClose={closeAuthModal} /> : null}
      </>
    );
  }

  if (screen.kind === 'recipe') {
    return (
      <>
        <RecipeView
          recipeId={screen.recipeId}
          fetchSavedRecipe={fetchSavedRecipe}
          onHome={routes.toHome}
          onEdit={wizard.loadSavedRecipe}
          onStartBake={bakeFlow.requestBakeStartForSavedRecipe}
          onDelete={(recipe) => navigation.requestDeleteRecipe(recipe.id)}
        />
        {dialogs}
        {devPanel}
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
          isStartingBake={isStartingBake}
          isSavedRecipe={Boolean(activeSavedRecipeId)}
        />
        {dialogs}
        {devPanel}
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
        {devPanel}
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
          resumableBakeSession={resumableBakeSession}
          importMessage={recipeImportMessage}
          onStart={wizard.startNewRecipe}
          onResumeDraft={() => void wizard.resumeDraft()}
          onResumeBake={bakeFlow.handleResumeBake}
          onLoadTemplate={wizard.loadTemplate}
          onLoadRecipe={routes.toRecipe}
          onDuplicateRecipe={(id) => void duplicateRecipe(id)}
          onOpenSaved={routes.toSaved}
          isSavedRecipesLoading={isSavedRecipesLoading}
          onOpenAuth={openAuthModal}
          onStartBake={(id) => void bakeFlow.startBakeFromSavedRecipe(id)}
          onRetrySavedRecipes={() => void loadSavedRecipes()}
          isSignedIn={Boolean(user)}
          isAuthConfigured={isConfigured}
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
          historyPhotoActions={{
            version: historyPhotoVersion,
            onChange: changeHistoryPhoto,
            onRemove: removeHistoryPhoto,
          }}
          onBakeAgainFromHistory={(session) => void bakeFlow.startBakeAgainFromHistory(session)}
          recipeBakeStats={recipeBakeStats}
          onDevPanelUnlock={() => setIsDevPanelOpen(true)}
        >
          {dialogs}
          {devPanel}
          {isAuthModalOpen ? <AuthModal onClose={closeAuthModal} /> : null}
          {photoNotice ? <Toast message={photoNotice} /> : null}
        </WelcomeScreen>
      </>
    );
  }

  if (!isInputWizardStep(wizardStep)) {
    return null;
  }

  return (
    <WizardInputSteps
      currentStep={wizardStep}
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
      {devPanel}
    </WizardInputSteps>
  );
}
