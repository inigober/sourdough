import type { ReactNode } from 'react';

import { AppBottomNav, type AppMainTab } from '../../components/AppBottomNav.tsx';
import { ChromeBackButton } from '../../components/ChromeBackButton.tsx';
import { ScreenChrome } from '../../components/ScreenChrome.tsx';
import { useDevPanelUnlock } from '../../lib/dev/useDevPanelUnlock.ts';
import type { BakeSession } from '../../lib/companion/types.ts';
import type {
  BakeHistorySession,
  BakeHistorySessionSummary,
  UpdateBakeHistorySessionInput,
} from '../../lib/history/types.ts';
import type { BuilderDraftSummary } from '../../lib/storage/draftStorage.ts';
import type { SavedRecipeSummary } from '../../lib/storage/types.ts';
import type { RecipeBakeStats } from '../../lib/history/recipeBakeStats.ts';
import { BakeHistoryDetailView, type BakeHistoryPhotoActions } from '../history/BakeHistoryDetailView.tsx';
import { BakeHistoryView } from '../history/BakeHistoryView.tsx';
import { SavedRecipesView } from '../saved-recipes/SavedRecipesView.tsx';
import { WelcomeStep } from './steps/WelcomeStep.tsx';

type WelcomeScreenProps = {
  showBottomNav: boolean;
  mainTab: AppMainTab;
  onTabChange: (tab: AppMainTab) => void;
  savedRecipes: SavedRecipeSummary[];
  savedRecipesError: string | null;
  draftSummary: BuilderDraftSummary | null;
  resumableBakeSession: BakeSession | null;
  importMessage: string | null;
  onStart: () => void;
  onResumeDraft: () => void;
  onResumeBake: () => void;
  onLoadTemplate: (templateId: string) => void;
  onLoadRecipe: (id: string) => void;
  onDuplicateRecipe: (id: string) => void;
  onOpenSaved: () => void;
  isSavedRecipesLoading: boolean;
  onOpenAuth: () => void;
  onStartBake: (id: string) => void;
  onRetrySavedRecipes: () => void;
  isSignedIn: boolean;
  isAuthConfigured: boolean;
  bakeHistory: BakeHistorySessionSummary[];
  bakeHistoryLoadError: string | null;
  historyDetailId: string | null;
  isLoadingHistoryDetail: boolean;
  activeHistorySession: BakeHistorySession | null;
  isSavingHistoryDetail: boolean;
  historyDetailError: string | null;
  historyDetailLoadError: string | null;
  onOpenHistoryEntry: (id: string) => void;
  onRetryHistoryLoad: () => void;
  onCloseHistoryDetail: () => void;
  onUpdateHistoryDetail: (input: UpdateBakeHistorySessionInput) => Promise<void>;
  onBakeAgainFromHistory: (session: BakeHistorySession) => void;
  recipeBakeStats: Record<string, RecipeBakeStats>;
  onDeleteHistoryDetail: () => Promise<void>;
  historyPhotoActions: BakeHistoryPhotoActions;
  onDevPanelUnlock: () => void;
  children?: ReactNode;
};

export function WelcomeScreen({
  showBottomNav,
  mainTab,
  onTabChange,
  savedRecipes,
  savedRecipesError,
  draftSummary,
  resumableBakeSession,
  importMessage,
  onStart,
  onResumeDraft,
  onResumeBake,
  onLoadTemplate,
  onLoadRecipe,
  onDuplicateRecipe,
  onOpenSaved,
  isSavedRecipesLoading,
  onOpenAuth,
  onStartBake,
  onRetrySavedRecipes,
  isSignedIn,
  isAuthConfigured,
  bakeHistory,
  bakeHistoryLoadError,
  historyDetailId,
  isLoadingHistoryDetail,
  activeHistorySession,
  isSavingHistoryDetail,
  historyDetailError,
  historyDetailLoadError,
  onOpenHistoryEntry,
  onRetryHistoryLoad,
  onCloseHistoryDetail,
  onUpdateHistoryDetail,
  onDeleteHistoryDetail,
  historyPhotoActions,
  onBakeAgainFromHistory,
  recipeBakeStats,
  onDevPanelUnlock,
  children,
}: WelcomeScreenProps) {
  const { registerUnlockTap } = useDevPanelUnlock(onDevPanelUnlock);

  return (
    <div className={showBottomNav ? 'main-screen main-screen--with-nav' : 'main-screen'}>
      {mainTab === 'home' ? (
        <WelcomeStep
          savedRecipes={savedRecipes}
          savedRecipesError={savedRecipesError}
          draftSummary={draftSummary}
          resumableBakeSession={resumableBakeSession}
          importMessage={importMessage}
          onStart={onStart}
          onResumeDraft={onResumeDraft}
          onResumeBake={onResumeBake}
          onLoadTemplate={onLoadTemplate}
          onLoadRecipe={onLoadRecipe}
          onOpenSaved={onOpenSaved}
          onOpenAuth={onOpenAuth}
          onStartBake={onStartBake}
          recipeBakeStats={recipeBakeStats}
          onRetrySavedRecipes={onRetrySavedRecipes}
        />
      ) : null}
      {mainTab === 'saved' ? (
        <SavedRecipesView
          savedRecipes={savedRecipes}
          savedRecipesError={savedRecipesError}
          isLoading={isSavedRecipesLoading}
          recipeBakeStats={recipeBakeStats}
          onNewRecipe={onStart}
          onOpenRecipe={onLoadRecipe}
          onStartBake={onStartBake}
          onDuplicateRecipe={onDuplicateRecipe}
          onRetry={onRetrySavedRecipes}
        />
      ) : null}
      {mainTab === 'history' && !historyDetailId ? (
        <BakeHistoryView
          isSignedIn={isSignedIn}
          canSignIn={isAuthConfigured}
          entries={bakeHistory}
          loadError={bakeHistoryLoadError}
          onOpenAuth={onOpenAuth}
          onOpenEntry={onOpenHistoryEntry}
          onRetryLoad={onRetryHistoryLoad}
        />
      ) : null}
      {mainTab === 'history' && historyDetailId ? (
        isLoadingHistoryDetail ? (
          <>
            <ScreenChrome
              title="Bake details"
              leading={<ChromeBackButton label="Back to history" onClick={onCloseHistoryDetail} />}
            />
            <div className="welcome-screen">
              <p className="saved-recipes__empty">Loading bake details…</p>
            </div>
          </>
        ) : activeHistorySession ? (
          <BakeHistoryDetailView
            session={activeHistorySession}
            isSaving={isSavingHistoryDetail}
            saveError={historyDetailError}
            onBack={onCloseHistoryDetail}
            onUpdate={onUpdateHistoryDetail}
            onDelete={onDeleteHistoryDetail}
            photoActions={historyPhotoActions}
            onBakeAgain={() => onBakeAgainFromHistory(activeHistorySession)}
          />
        ) : historyDetailLoadError ? (
          <>
            <ScreenChrome
              title="Bake details"
              leading={<ChromeBackButton label="Back to history" onClick={onCloseHistoryDetail} />}
            />
            <div className="welcome-screen">
              <p className="auth-modal__error" role="alert">
                {historyDetailLoadError}
              </p>
              <div className="bake-history-detail__edit-actions">
                <button type="button" className="button button--secondary" onClick={onCloseHistoryDetail}>
                  Back to history
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => historyDetailId && onOpenHistoryEntry(historyDetailId)}
                >
                  Try again
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <ScreenChrome
              title="Bake details"
              leading={<ChromeBackButton label="Back to history" onClick={onCloseHistoryDetail} />}
            />
            <div className="welcome-screen">
              <p className="saved-recipes__empty">This bake could not be found.</p>
              <button type="button" className="button button--secondary" onClick={onCloseHistoryDetail}>
                Back to history
              </button>
            </div>
          </>
        )
      ) : null}
      {showBottomNav ? (
        <AppBottomNav
          activeTab={mainTab}
          onTabChange={onTabChange}
          onDevUnlockTap={() => registerUnlockTap()}
        />
      ) : null}
      {children}
    </div>
  );
}
