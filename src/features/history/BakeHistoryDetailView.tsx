import { useMemo, useState } from 'react';

import { BakePhotoPicker } from '../companion/BakePhotoPicker.tsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { DialogCard } from '../../components/DialogCard.tsx';
import { ChromeBackButton } from '../../components/ChromeBackButton.tsx';
import { LoafAssessmentPicker } from '../../components/LoafAssessmentPicker.tsx';
import { BinIcon, CameraIcon } from '../../components/icons.tsx';
import { PageShell } from '../../components/PageShell.tsx';
import { PenEditButton } from '../../components/PenEditButton.tsx';
import { RecipeCard } from '../../components/RecipeCard.tsx';
import { ScreenChrome } from '../../components/ScreenChrome.tsx';
import { BakePlanTimeline } from '../schedule-builder/BakePlanTimeline.tsx';
import { getLoafAssessmentLabel } from '../../lib/history/assessment.ts';
import {
  formatDriftMinutes,
  formatHistoryDate,
  formatHistoryTimeRange,
  getStartDriftMinutes,
} from '../../lib/history/formatHistory.ts';
import type { BakeHistorySession, BakeSessionAssessment, UpdateBakeHistorySessionInput } from '../../lib/history/types.ts';
import { useBakePhotoUrls } from '../../lib/history/useBakePhotoUrls.ts';
import { calculateRecipe } from '../../lib/recipe/calculateRecipe.ts';
import { buildIngredientRows, type IngredientRow } from '../../lib/recipe/formatIngredients.ts';
import { buildTimeline, formatTimelineForDisplay } from '../../lib/schedule/buildTimeline.ts';
import { formatBakeDateLong, getBakeDateIso, getMixDateIso } from '../../lib/schedule/dates.ts';

/** Adding, replacing and removing the loaf photo of a saved bake. Each resolves with a message, or null. */
export type BakeHistoryPhotoActions = {
  /** Changes when the photo was changed, so the photo link is looked up again. */
  version: number;
  onChange: (photo: Blob) => Promise<string | null>;
  onRemove: () => Promise<string | null>;
};

type BakeHistoryDetailViewProps = {
  session: BakeHistorySession;
  isSaving: boolean;
  saveError: string | null;
  onBack: () => void;
  onUpdate: (input: UpdateBakeHistorySessionInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onBakeAgain: () => void;
  photoActions: BakeHistoryPhotoActions;
};

export function BakeHistoryDetailView({
  session,
  isSaving,
  saveError,
  onBack,
  onUpdate,
  onDelete,
  onBakeAgain,
  photoActions,
}: BakeHistoryDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const photoUrl = useBakePhotoUrls([{ id: session.id, photoPath: session.photoPath }], {
    version: photoActions.version,
  }).get(session.id);
  // Photo editing: choosing a new photo (add or replace), saving it, removing it.
  const [isChoosingPhoto, setIsChoosingPhoto] = useState(false);
  const [chosenPhoto, setChosenPhoto] = useState<Blob | null>(null);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [isRemovePhotoDialogOpen, setIsRemovePhotoDialogOpen] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  // Changing the key gives the picker a fresh, empty state after each save or cancel.
  const [photoPickerKey, setPhotoPickerKey] = useState(0);
  // No photo and nothing chosen yet: show a compact "add a photo" row instead of an empty card.
  const isPhotoEmpty = !photoUrl && !chosenPhoto && !isPreparingPhoto;
  const [draftNote, setDraftNote] = useState(session.overallNote ?? '');
  const [draftAssessment, setDraftAssessment] = useState<BakeSessionAssessment | undefined>(
    session.overallAssessment,
  );

  const durationMinutes = Math.max(
    0,
    Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 60_000),
  );
  const assessmentLabel = getLoafAssessmentLabel(session.overallAssessment);
  const formula = useMemo(() => {
    try {
      return calculateRecipe(session.recipeInput);
    } catch {
      return null;
    }
  }, [session.recipeInput]);
  const ingredientRows = useMemo(() => {
    if (!formula) {
      return [];
    }

    return [
      ...buildIngredientRows(session.recipeInput, formula),
      ['Prefermented flour', `${formula.prefermentedFlourPercent}%`] as IngredientRow,
    ];
  }, [formula, session.recipeInput]);
  const plannedTimeline = useMemo(
    () => formatTimelineForDisplay(buildTimeline(session.scheduleInput, session.recipeInput)),
    [session.recipeInput, session.scheduleInput],
  );
  const mixDateLabel = formatBakeDateLong(getMixDateIso(session.scheduleInput));
  const bakeDateLabel = formatBakeDateLong(getBakeDateIso(session.scheduleInput, session.recipeInput));

  async function handleSaveEdits(): Promise<void> {
    await onUpdate({
      overallNote: draftNote,
      overallAssessment: draftAssessment ?? null,
    });
    setIsEditing(false);
  }

  function closePhotoPicker(): void {
    setIsChoosingPhoto(false);
    setChosenPhoto(null);
    setPhotoPickerKey((key) => key + 1);
  }

  async function handleSavePhoto(): Promise<void> {
    if (!chosenPhoto) {
      return;
    }

    setIsSavingPhoto(true);
    setPhotoMessage(null);
    try {
      setPhotoMessage(await photoActions.onChange(chosenPhoto));
    } finally {
      setIsSavingPhoto(false);
      closePhotoPicker();
    }
  }

  async function handleRemovePhoto(): Promise<void> {
    setIsSavingPhoto(true);
    setPhotoMessage(null);
    try {
      setPhotoMessage(await photoActions.onRemove());
    } finally {
      setIsSavingPhoto(false);
    }
  }

  function startEditing(): void {
    setDraftNote(session.overallNote ?? '');
    setDraftAssessment(session.overallAssessment);
    setIsEditing(true);
  }

  return (
    <PageShell
      className="bake-history-detail"
      topBar={
        <ScreenChrome
          title={session.recipeName}
          leading={<ChromeBackButton label="Back to history" onClick={onBack} />}
          trailing={!isEditing ? <PenEditButton label="Edit bake notes" onClick={startEditing} /> : null}
        />
      }
    >
      <section className="hero bake-history-detail__hero">
        <div className="bake-history-detail__hero-row">
          <div>
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
        </div>
        <button
          type="button"
          className="wizard-button wizard-button--primary bake-history-detail__bake-again"
          onClick={onBakeAgain}
        >
          Bake again
        </button>
      </section>

      <section
        className={`card bake-history-detail__photo${isPhotoEmpty ? ' bake-history-detail__photo--empty' : ''}`}
        aria-label="Loaf photo"
      >
        <h2 className={`bake-history-detail__section-title${isPhotoEmpty ? ' visually-hidden' : ''}`}>
          Loaf photo
        </h2>
        {photoUrl ? (
          <button
            type="button"
            className="bake-photo-button"
            aria-label="View loaf photo larger"
            onClick={() => setIsPhotoOpen(true)}
          >
            <img src={photoUrl} alt={`Your ${session.recipeName} loaf`} className="bake-photo-button__image" />
          </button>
        ) : null}

        {!photoUrl || isChoosingPhoto ? (
          <>
            <BakePhotoPicker
              key={photoPickerKey}
              label={photoUrl ? 'New photo' : 'Add a photo of this loaf'}
              compact={isPhotoEmpty}
              onChange={setChosenPhoto}
              onBusyChange={setIsPreparingPhoto}
              disabled={isSavingPhoto}
            />
            {chosenPhoto || photoUrl ? (
              <div className="bake-history-detail__photo-actions">
                {chosenPhoto ? (
                  <button
                    type="button"
                    className="wizard-button wizard-button--primary"
                    onClick={() => void handleSavePhoto()}
                    disabled={isSavingPhoto || isPreparingPhoto}
                  >
                    {isSavingPhoto ? 'Saving photo…' : 'Save photo'}
                  </button>
                ) : null}
                {photoUrl ? (
                  <button
                    type="button"
                    className="wizard-button wizard-button--secondary"
                    onClick={closePhotoPicker}
                    disabled={isSavingPhoto}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <div className="bake-history-detail__photo-actions">
            <button
              type="button"
              className="wizard-button wizard-button--secondary bake-history-detail__photo-action"
              onClick={() => setIsChoosingPhoto(true)}
              disabled={isSavingPhoto}
            >
              <CameraIcon />
              <span>Replace photo</span>
            </button>
            <button
              type="button"
              className="wizard-button wizard-button--secondary bake-history-detail__photo-action"
              onClick={() => setIsRemovePhotoDialogOpen(true)}
              disabled={isSavingPhoto}
            >
              <BinIcon />
              <span>Remove photo</span>
            </button>
          </div>
        )}

        {photoMessage ? (
          <p className="bake-history-detail__photo-message" role="status">
            {photoMessage}
          </p>
        ) : null}
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
            <div className="field-card">
              <span className="field-label-row">
                Loaf assessment (optional)
              </span>
              <LoafAssessmentPicker value={draftAssessment} onChange={setDraftAssessment} />
            </div>
            <label className="field-card">
              <span className="field-label-row">Bake notes (optional)</span>
              <textarea
                rows={4}
                value={draftNote}
                onChange={(event) => setDraftNote(event.currentTarget.value)}
                placeholder="What went well? Anything to adjust next time?"
              />
            </label>
            {saveError ? (
              <p className="auth-modal__error" role="alert">
                {saveError}
              </p>
            ) : null}
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

      <section className="card bake-history-detail__recipe" aria-label="Recipe snapshot">
        <h2 className="bake-history-detail__section-title">Recipe ingredients</h2>
        <p className="section-copy">Ingredient amounts from when this bake was saved.</p>
        {formula ? (
          <RecipeCard title="Ingredient list" rows={ingredientRows} embedded />
        ) : (
          <p className="saved-recipes__empty">Ingredient amounts could not be calculated from the saved recipe.</p>
        )}
      </section>

      <section className="card bake-history-detail__schedule" aria-label="Schedule snapshot">
        <h2 className="bake-history-detail__section-title">Planned schedule</h2>
        <p className="section-copy">
          Schedule settings saved with this bake. Companion timing shifts are shown in the actual step timings
          below.
        </p>
        <BakePlanTimeline
          steps={plannedTimeline}
          caption={`Clock times on mix day (${mixDateLabel}). Oven-bake on ${bakeDateLabel}.`}
          embedded
        />
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
        {saveError && !isEditing ? (
          <p className="auth-modal__error" role="alert">
            {saveError}
          </p>
        ) : null}
        <button
          type="button"
          className="wizard-button bake-history-detail__delete"
          onClick={() => setIsDeleteDialogOpen(true)}
          disabled={isSaving}
        >
          Delete bake
        </button>
      </div>

      {isPhotoOpen && photoUrl ? (
        <DialogCard
          title="Your loaf"
          titleId="bake-photo-dialog-title"
          onClose={() => setIsPhotoOpen(false)}
          actions={
            <div className="dialog-card__actions">
              <button
                type="button"
                className="wizard-button wizard-button--secondary"
                onClick={() => setIsPhotoOpen(false)}
              >
                Close
              </button>
            </div>
          }
        >
          <img src={photoUrl} alt={`Your ${session.recipeName} loaf`} className="bake-photo-large" />
        </DialogCard>
      ) : null}

      {isRemovePhotoDialogOpen ? (
        <ConfirmDialog
          title="Remove this photo?"
          message="The photo of this loaf will be deleted. The rest of the bake stays in your history."
          confirmLabel="Remove photo"
          onCancel={() => setIsRemovePhotoDialogOpen(false)}
          onConfirm={() => {
            setIsRemovePhotoDialogOpen(false);
            void handleRemovePhoto();
          }}
        />
      ) : null}

      {isDeleteDialogOpen ? (
        <ConfirmDialog
          title="Delete this bake?"
          message={
            photoUrl
              ? 'This bake, its step timings and its photo will be removed from your history.'
              : 'This bake and its step timings will be removed from your history.'
          }
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
