import { useMemo, useState } from 'react';

import { ScreenChrome } from '../../components/ScreenChrome.tsx';
import { CloseIcon, FilterIcon, LoafIcon, SearchIcon } from '../../components/icons.tsx';
import { LoafAssessmentPicker } from '../../components/LoafAssessmentPicker.tsx';
import { getLoafAssessmentLabel } from '../../lib/history/assessment.ts';
import { buildBakeSummaryLine } from '../../lib/history/bakeSummaryLine.ts';
import {
  filterBakeHistoryEntries,
  shouldShowHistorySearch,
  type BakeHistoryAssessmentFilter,
} from '../../lib/history/filterBakeHistory.ts';
import { formatHistoryDate } from '../../lib/history/formatHistory.ts';
import {
  dismissHistoryBackupNudge,
  isHistoryBackupNudgeDismissed,
} from '../../lib/history/historyBackupNudgeStorage.ts';
import type { BakeHistorySessionSummary } from '../../lib/history/types.ts';
import { useBakePhotoUrls } from '../../lib/history/useBakePhotoUrls.ts';
import { describeResultCount } from '../../lib/ui/resultCount.ts';

type BakeHistoryViewProps = {
  isSignedIn: boolean;
  /** False when Supabase is not set up; then there is nothing to sign in to. */
  canSignIn: boolean;
  entries: BakeHistorySessionSummary[];
  loadError: string | null;
  onOpenAuth: () => void;
  onOpenEntry: (id: string) => void;
  onRetryLoad: () => void;
};

export function BakeHistoryView({
  isSignedIn,
  canSignIn,
  entries,
  loadError,
  onOpenAuth,
  onOpenEntry,
  onRetryLoad,
}: BakeHistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [assessmentFilter, setAssessmentFilter] = useState<BakeHistoryAssessmentFilter>('all');
  const [isBackupNudgeDismissed, setIsBackupNudgeDismissed] = useState(() =>
    isHistoryBackupNudgeDismissed(),
  );
  const showBackupNudge = !isSignedIn && canSignIn && entries.length > 0 && !isBackupNudgeDismissed;

  const photoUrls = useBakePhotoUrls(entries, { size: 'thumbnail' });

  // A short list needs neither control. Ignore a stale query or filter if deleting bakes hides them.
  const showSearch = shouldShowHistorySearch(entries.length);

  const filteredEntries = useMemo(
    () =>
      showSearch ? filterBakeHistoryEntries(entries, searchQuery, assessmentFilter) : entries,
    [assessmentFilter, entries, searchQuery, showSearch],
  );

  return (
    <>
      <ScreenChrome title="Bake history" />
      <div className="welcome-screen bake-history-screen">
        <section className="hero welcome-screen__hero">
          <p className="hero-copy">
            Review completed bakes with actual step timings and notes so you can learn from each loaf.
          </p>
        </section>

      <section className="card bake-history" aria-label="Bake history list">
        {showBackupNudge ? (
          <div className="bake-history__backup-nudge" role="note">
            <p className="bake-history__backup-nudge-text">
              Saved on this device.{' '}
              <button type="button" className="bake-history__backup-nudge-link" onClick={onOpenAuth}>
                Sign in to back up
              </button>
            </p>
            <button
              type="button"
              className="icon-button bake-history__backup-nudge-dismiss"
              aria-label="Dismiss backup reminder"
              onClick={() => {
                dismissHistoryBackupNudge();
                setIsBackupNudgeDismissed(true);
              }}
            >
              <CloseIcon />
            </button>
          </div>
        ) : null}
        {loadError ? (
          <div className="bake-history__error" role="alert">
            <p className="auth-modal__error">{loadError}</p>
            <button type="button" className="wizard-button wizard-button--secondary" onClick={onRetryLoad}>
              Try again
            </button>
          </div>
        ) : null}
        {showSearch ? (
          <div className="bake-history__filters">
            <label className="field-card bake-history__search">
              <span className="field-label-row field-label-row--with-icon">
                <SearchIcon />
                <span>Search</span>
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                placeholder="Recipe name or notes"
              />
            </label>
            <label className="field-card bake-history__filter">
              <span className="field-label-row field-label-row--with-icon">
                <FilterIcon />
                <span>Filter</span>
              </span>
              <select
                value={assessmentFilter}
                onChange={(event) =>
                  setAssessmentFilter(event.currentTarget.value as BakeHistoryAssessmentFilter)
                }
              >
                <option value="all">All bakes</option>
                <option value="great">Great loaf</option>
                <option value="ok">OK</option>
                <option value="needsWork">Needs work</option>
                <option value="unset">No assessment</option>
              </select>
            </label>
          </div>
        ) : null}

        {entries.length > 0 && filteredEntries.length === 0 ? (
          <p className="saved-recipes__empty" role="status">
            No bakes match your search or filter.
          </p>
        ) : null}

        {/* Screen readers: say how many bakes the search or filter left. */}
        {filteredEntries.length > 0 && (searchQuery || assessmentFilter !== 'all') ? (
          <p className="visually-hidden" role="status">
            {describeResultCount(filteredEntries.length, 'bake')}
          </p>
        ) : null}

        {filteredEntries.length > 0 ? (
          <ul className="saved-recipes__list">
            {filteredEntries.map((entry) => {
              const assessmentLabel = getLoafAssessmentLabel(entry.overallAssessment);
              const photoUrl = photoUrls.get(entry.id);
              const summaryLine = buildBakeSummaryLine(entry.recipeFacts);

              return (
                <li key={entry.id} className="saved-recipe-card">
                  <button
                    type="button"
                    className="saved-recipe-card__open bake-history__entry-open"
                    onClick={() => onOpenEntry(entry.id)}
                  >
                    <span className="bake-history__thumb" aria-hidden="true">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt=""
                          className="bake-history__thumb-image"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <LoafIcon className="bake-history__thumb-placeholder" />
                      )}
                    </span>
                    <span className="bake-history__entry-text">
                      <strong>{entry.recipeName}</strong>
                      <span className="saved-recipe-card__meta">
                        Baked {formatHistoryDate(entry.completedAt)}
                        {assessmentLabel ? (
                          <span className="bake-history__assessment-badge">
                            Assessment · {assessmentLabel}
                          </span>
                        ) : null}
                      </span>
                      {summaryLine ? (
                        <span className="bake-history__recipe-line">
                          <span className="visually-hidden">Recipe: </span>
                          {summaryLine}
                        </span>
                      ) : null}
                      {entry.overallNotePreview ? (
                        <span className="bake-history__note-preview">{entry.overallNotePreview}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : entries.length === 0 ? (
          <p className="saved-recipes__empty">
            No bake history yet. Finish a bake and tap Save bake to add one.
          </p>
        ) : null}
      </section>
    </div>
    </>
  );
}
