import type { ReactNode } from 'react';

import { AppBottomNav, type AppMainTab } from '../../components/AppBottomNav.tsx';
import { useDevPanelUnlock } from '../../lib/dev/useDevPanelUnlock.ts';
import type { BakeSession } from '../../lib/companion/types.ts';
import type {
  BakeHistorySession,
  BakeHistorySessionSummary,
  UpdateBakeHistorySessionInput,
} from '../../lib/history/types.ts';
import type { BuilderDraftSummary } from '../../lib/storage/draftStorage.ts';
import type { SavedRecipeSummary } from '../../lib/storage/types.ts';
import { BakeHistoryDetailView } from '../history/BakeHistoryDetailView.tsx';
import { BakeHistoryView } from '../history/BakeHistoryView.tsx';
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
  onDeleteRecipe: (id: string) => void;
  onOpenAuth: () => void;
  onStartBake: (id: string) => void;
  onRetrySavedRecipes: () => void;
  isSignedIn: boolean;
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
  onDeleteHistoryDetail: () => Promise<void>;
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
  onDeleteRecipe,
  onOpenAuth,
  onStartBake,
  onRetrySavedRecipes,
  isSignedIn,
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
          onDuplicateRecipe={onDuplicateRecipe}
          onDeleteRecipe={onDeleteRecipe}
          onOpenAuth={onOpenAuth}
          onStartBake={onStartBake}
          onRetrySavedRecipes={onRetrySavedRecipes}
          onDevUnlockTap={() => registerUnlockTap()}
        />
      ) : null}
      {mainTab === 'history' && !historyDetailId ? (
        <BakeHistoryView
          isSignedIn={isSignedIn}
          entries={bakeHistory}
          loadError={bakeHistoryLoadError}
          onOpenAuth={onOpenAuth}
          onOpenEntry={onOpenHistoryEntry}
          onRetryLoad={onRetryHistoryLoad}
        />
      ) : null}
      {mainTab === 'history' && historyDetailId ? (
        isLoadingHistoryDetail ? (
          <div className="welcome-screen">
            <p className="saved-recipes__empty">Loading bake details…</p>
          </div>
        ) : activeHistorySession ? (
          <BakeHistoryDetailView
            session={activeHistorySession}
            isSaving={isSavingHistoryDetail}
            saveError={historyDetailError}
            onBack={onCloseHistoryDetail}
            onUpdate={onUpdateHistoryDetail}
            onDelete={onDeleteHistoryDetail}
          />
        ) : historyDetailLoadError ? (
          <div className="welcome-screen">
            <p className="auth-modal__error" role="alert">
              {historyDetailLoadError}
            </p>
            <div className="bake-history-detail__edit-actions">
              <button type="button" className="wizard-button wizard-button--secondary" onClick={onCloseHistoryDetail}>
                Back to history
              </button>
              <button
                type="button"
                className="wizard-button wizard-button--primary"
                onClick={() => historyDetailId && onOpenHistoryEntry(historyDetailId)}
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <div className="welcome-screen">
            <p className="saved-recipes__empty">This bake could not be found.</p>
            <button type="button" className="wizard-button wizard-button--secondary" onClick={onCloseHistoryDetail}>
              Back to history
            </button>
          </div>
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
