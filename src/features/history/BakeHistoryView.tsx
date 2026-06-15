import { useMemo, useState } from 'react';

import { FilterIcon, SearchIcon } from '../../components/icons.tsx';
import { LoafAssessmentPicker } from '../../components/LoafAssessmentPicker.tsx';
import { getLoafAssessmentLabel } from '../../lib/history/assessment.ts';
import {
  filterBakeHistoryEntries,
  type BakeHistoryAssessmentFilter,
} from '../../lib/history/filterBakeHistory.ts';
import { formatHistoryDate } from '../../lib/history/formatHistory.ts';
import type { BakeHistorySessionSummary } from '../../lib/history/types.ts';

type BakeHistoryViewProps = {
  isSignedIn: boolean;
  entries: BakeHistorySessionSummary[];
  loadError: string | null;
  onOpenAuth: () => void;
  onOpenEntry: (id: string) => void;
  onRetryLoad: () => void;
};

export function BakeHistoryView({
  isSignedIn,
  entries,
  loadError,
  onOpenAuth,
  onOpenEntry,
  onRetryLoad,
}: BakeHistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [assessmentFilter, setAssessmentFilter] = useState<BakeHistoryAssessmentFilter>('all');

  const filteredEntries = useMemo(
    () => filterBakeHistoryEntries(entries, searchQuery, assessmentFilter),
    [assessmentFilter, entries, searchQuery],
  );

  return (
    <div className="welcome-screen bake-history-screen">
      <section className="hero welcome-screen__hero">
        <h1>Bake history</h1>
        <p className="hero-copy">
          Review completed bakes with actual step timings and notes so you can learn from each loaf.
        </p>
      </section>

      <section className="card bake-history" aria-label="Bake history list">
        {!isSignedIn ? (
          <div className="bake-history__signin">
            <p className="saved-recipes__empty">Sign in to save and view your bake history.</p>
            <button type="button" className="wizard-button wizard-button--secondary" onClick={onOpenAuth}>
              Sign in
            </button>
          </div>
        ) : (
          <>
            {loadError ? (
              <div className="bake-history__error" role="alert">
                <p className="auth-modal__error">{loadError}</p>
                <button type="button" className="wizard-button wizard-button--secondary" onClick={onRetryLoad}>
                  Try again
                </button>
              </div>
            ) : null}
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

            {entries.length > 0 && filteredEntries.length === 0 ? (
              <p className="saved-recipes__empty">No bakes match your search or filter.</p>
            ) : null}

            {filteredEntries.length > 0 ? (
              <ul className="saved-recipes__list">
                {filteredEntries.map((entry) => {
                  const assessmentLabel = getLoafAssessmentLabel(entry.overallAssessment);

                  return (
                    <li key={entry.id} className="saved-recipe-card">
                      <button
                        type="button"
                        className="saved-recipe-card__open"
                        onClick={() => onOpenEntry(entry.id)}
                      >
                        <strong>{entry.recipeName}</strong>
                        <span className="saved-recipe-card__meta">
                          Baked {formatHistoryDate(entry.completedAt)}
                          {assessmentLabel ? (
                            <>
                              <span className="saved-recipe-card__meta-sep" aria-hidden="true">
                                ·
                              </span>
                              <span className="bake-history__assessment-badge">
                                Assessment · {assessmentLabel}
                              </span>
                            </>
                          ) : null}
                        </span>
                        {entry.overallNotePreview ? (
                          <span className="bake-history__note-preview">{entry.overallNotePreview}</span>
                        ) : null}
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
          </>
        )}
      </section>
    </div>
  );
}
