import { useState } from 'react';

import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { LoafAssessmentPicker } from '../../components/LoafAssessmentPicker.tsx';
import { PageShell } from '../../components/PageShell.tsx';
import { PenEditButton } from '../../components/PenEditButton.tsx';
import { ArrowLeftIcon } from '../../components/icons.tsx';
import { getLoafAssessmentLabel } from '../../lib/history/assessment.ts';
import {
  formatDriftMinutes,
  formatHistoryDate,
  formatHistoryTimeRange,
  getStartDriftMinutes,
} from '../../lib/history/formatHistory.ts';
import type { BakeHistorySession, BakeSessionAssessment, UpdateBakeHistorySessionInput } from '../../lib/history/types.ts';

type BakeHistoryDetailViewProps = {
  session: BakeHistorySession;
  isSaving: boolean;
  saveError: string | null;
  onBack: () => void;
  onUpdate: (input: UpdateBakeHistorySessionInput) => Promise<void>;
  onDelete: () => Promise<void>;
};

export function BakeHistoryDetailView({
  session,
  isSaving,
  saveError,
  onBack,
  onUpdate,
  onDelete,
}: BakeHistoryDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [draftNote, setDraftNote] = useState(session.overallNote ?? '');
  const [draftAssessment, setDraftAssessment] = useState<BakeSessionAssessment | undefined>(
    session.overallAssessment,
  );

  const durationMinutes = Math.max(
    0,
    Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 60_000),
  );
  const assessmentLabel = getLoafAssessmentLabel(session.overallAssessment);

  async function handleSaveEdits(): Promise<void> {
    await onUpdate({
      overallNote: draftNote,
      overallAssessment: draftAssessment ?? null,
    });
    setIsEditing(false);
  }

  function startEditing(): void {
    setDraftNote(session.overallNote ?? '');
    setDraftAssessment(session.overallAssessment);
    setIsEditing(true);
  }

  return (
    <PageShell className="bake-history-detail">
      <button type="button" className="page-shell__secondary-link bake-history-detail__back" onClick={onBack}>
        <ArrowLeftIcon />
        Back to history
      </button>

      <section className="hero bake-history-detail__hero">
        <div className="bake-history-detail__hero-row">
          <div>
            <h1>{session.recipeName}</h1>
            <p className="hero-copy">
              Baked {formatHistoryDate(session.completedAt)} · total time {formatDuration(durationMinutes)}
            </p>
            {assessmentLabel && !isEditing ? (
              <p className="bake-history-detail__assessment">
                <span className="bake-history-detail__assessment-label">Assessment</span>
                <span aria-hidden="true"> · </span>
                {assessmentLabel}
              </p>
            ) : null}
          </div>
          {!isEditing ? <PenEditButton label="Edit bake notes" onClick={startEditing} /> : null}
        </div>
      </section>

      <section className="card bake-history-detail__note" aria-label="Bake notes">
        <h2 className="bake-history-detail__section-title">Notes & assessment</h2>
        {isEditing ? (
          <form
            className="bake-history-detail__edit-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveEdits();
            }}
          >
            <label className="field-card">
              <span className="field-label-row">Loaf assessment (optional)</span>
              <LoafAssessmentPicker value={draftAssessment} onChange={setDraftAssessment} />
            </label>
            <label className="field-card">
              <span className="field-label-row">Bake notes (optional)</span>
              <textarea
                rows={4}
                value={draftNote}
                onChange={(event) => setDraftNote(event.currentTarget.value)}
                placeholder="What went well? Anything to adjust next time?"
              />
            </label>
            {saveError ? <p className="auth-modal__error">{saveError}</p> : null}
            <div className="bake-history-detail__edit-actions">
              <button
                type="button"
                className="wizard-button wizard-button--secondary"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button type="submit" className="wizard-button wizard-button--primary" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : session.overallNote ? (
          <p className="bake-history-detail__note-text">{session.overallNote}</p>
        ) : (
          <p className="saved-recipes__empty">No notes for this bake yet.</p>
        )}
      </section>

      <section className="card bake-history-detail__steps" aria-label="Step timings">
        <h2 className="bake-history-detail__section-title">Step timings</h2>
        <ol className="bake-history-detail__step-list">
          {session.steps.map((step) => {
            const startDrift = getStartDriftMinutes(step.plannedStartAt, step.actualStartedAt);
            const plannedRange =
              step.plannedStartAt && step.plannedEndAt
                ? formatHistoryTimeRange(step.plannedStartAt, step.plannedEndAt)
                : null;

            return (
              <li key={step.id} className="bake-history-detail__step">
                <strong className="bake-history-detail__step-label">{step.stepLabel}</strong>
                <dl className="bake-history-detail__step-times">
                  {plannedRange ? (
                    <div className="bake-history-detail__step-row">
                      <dt>Planned</dt>
                      <dd>{plannedRange}</dd>
                    </div>
                  ) : null}
                  <div className="bake-history-detail__step-row">
                    <dt>Actual</dt>
                    <dd>{formatHistoryTimeRange(step.actualStartedAt, step.actualCompletedAt)}</dd>
                  </div>
                  {startDrift !== null && startDrift !== 0 ? (
                    <div className="bake-history-detail__step-row">
                      <dt>Start drift</dt>
                      <dd>{formatDriftMinutes(startDrift)}</dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="bake-history-detail__footer">
        {saveError && !isEditing ? <p className="auth-modal__error">{saveError}</p> : null}
        <button
          type="button"
          className="wizard-button bake-history-detail__delete"
          onClick={() => setIsDeleteDialogOpen(true)}
          disabled={isSaving}
        >
          Delete bake
        </button>
      </div>

      {isDeleteDialogOpen ? (
        <ConfirmDialog
          title="Delete this bake?"
          message="This bake and its step timings will be removed from your history."
          confirmLabel="Delete bake"
          onCancel={() => setIsDeleteDialogOpen(false)}
          onConfirm={() => {
            setIsDeleteDialogOpen(false);
            void onDelete();
          }}
        />
      ) : null}
    </PageShell>
  );
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}
