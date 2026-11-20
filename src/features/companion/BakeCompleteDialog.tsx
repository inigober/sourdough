import { useState, type MouseEvent } from 'react';

import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { DialogCard } from '../../components/DialogCard.tsx';
import { LoafAssessmentPicker } from '../../components/LoafAssessmentPicker.tsx';
import type { BakeCompleteSaveInput } from '../../lib/companion/types.ts';
import { BakePhotoPicker } from './BakePhotoPicker.tsx';
import type { BakeSessionAssessment } from '../../lib/history/types.ts';

export type { BakeCompleteSaveInput };

type BakeCompleteDialogProps = {
  recipeName: string;
  isSaving: boolean;
  saveError: string | null;
  onSave: (input: BakeCompleteSaveInput) => Promise<void>;
  /** X, Escape and backdrop: leave without saving but keep the bake so it can be resumed. */
  onNotNow: () => void;
  /** Explicit "Don't save" after confirmation: the only path that deletes the bake. */
  onDiscard: () => void;
};

export function BakeCompleteDialog({
  recipeName,
  isSaving,
  saveError,
  onSave,
  onNotNow,
  onDiscard,
}: BakeCompleteDialogProps) {
  const [note, setNote] = useState('');
  const [assessment, setAssessment] = useState<BakeSessionAssessment | undefined>();
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  function handleAction(event: MouseEvent<HTMLButtonElement>, action: () => void): void {
    event.stopPropagation();
    action();
  }

  return (
    <DialogCard
      title="Bake complete"
      titleId="bake-complete-title"
      messageId="bake-complete-message"
      variant="success"
      onClose={onNotNow}
      actions={
        <div className="dialog-card__actions">
          <button
            type="button"
            className="wizard-button wizard-button--secondary"
            onClick={(event) => handleAction(event, () => setIsDiscardConfirmOpen(true))}
            disabled={isSaving}
          >
            Don&apos;t save
          </button>
          <button
            type="button"
            className="wizard-button wizard-button--primary"
            onClick={(event) => handleAction(event, () => void onSave({ note, assessment, photo: photo ?? undefined }))}
            disabled={isSaving || isPreparingPhoto}
          >
            {isSaving ? 'Saving…' : 'Save bake'}
          </button>
        </div>
      }
    >
      <p id="bake-complete-message" className="dialog-card__message">
        Nice work finishing <strong>{recipeName}</strong>. Your loaf is ready to cool and enjoy.
      </p>
      <div className="dialog-card__fields">
        {/* A div, not a label: a label around buttons would forward taps on its text to the first button. */}
        <div className="field-card">
          <span className="field-label-row">
            Loaf assessment (optional)
          </span>
          <LoafAssessmentPicker value={assessment} onChange={setAssessment} />
        </div>
        <label className="field-card">
          <span className="field-label-row">Bake notes (optional)</span>
          <textarea
            rows={4}
            value={note}
            onChange={(event) => setNote(event.currentTarget.value)}
            placeholder="What went well? Anything to adjust next time?"
          />
        </label>
        <BakePhotoPicker onChange={setPhoto} onBusyChange={setIsPreparingPhoto} disabled={isSaving} />
      </div>
      {saveError ? (
        <p className="auth-modal__error" role="alert">
          {saveError}
        </p>
      ) : null}
      <p className="dialog-card__message">
        Closing this window keeps your bake, and you can finish saving it later from Home.
      </p>
      {isDiscardConfirmOpen ? (
        <ConfirmDialog
          title="Don't save this bake?"
          message="This bake and its step timings will be deleted. This cannot be undone."
          confirmLabel="Delete bake"
          onCancel={() => setIsDiscardConfirmOpen(false)}
          onConfirm={() => {
            setIsDiscardConfirmOpen(false);
            onDiscard();
          }}
        />
      ) : null}
    </DialogCard>
  );
}
