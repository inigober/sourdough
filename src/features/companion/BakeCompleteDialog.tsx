import { useState } from 'react';

import { DialogCard } from '../../components/DialogCard.tsx';
import { LoafAssessmentPicker } from '../../components/LoafAssessmentPicker.tsx';
import type { BakeCompleteSaveInput } from '../../lib/companion/types.ts';
import type { BakeSessionAssessment } from '../../lib/history/types.ts';

export type { BakeCompleteSaveInput };

type BakeCompleteDialogProps = {
  recipeName: string;
  isSaving: boolean;
  saveError: string | null;
  onSave: (input: BakeCompleteSaveInput) => Promise<void>;
  onClose: () => void;
};

export function BakeCompleteDialog({
  recipeName,
  isSaving,
  saveError,
  onSave,
  onClose,
}: BakeCompleteDialogProps) {
  const [note, setNote] = useState('');
  const [assessment, setAssessment] = useState<BakeSessionAssessment | undefined>();

  return (
    <DialogCard
      title="Bake complete"
      titleId="bake-complete-title"
      messageId="bake-complete-message"
      variant="success"
      onClose={onClose}
      actions={
        <div className="dialog-card__actions">
          <button type="button" className="wizard-button wizard-button--secondary" onClick={onClose} disabled={isSaving}>
            Back to home
          </button>
          <button
            type="button"
            className="wizard-button wizard-button--primary"
            onClick={() => void onSave({ note, assessment })}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save bake'}
          </button>
        </div>
      }
    >
      <p id="bake-complete-message" className="dialog-card__message">
        Nice work finishing <strong>{recipeName}</strong>. Your loaf is ready to cool and enjoy.
      </p>
      <label className="field-card">
        <span className="field-label-row">Loaf assessment (optional)</span>
        <LoafAssessmentPicker value={assessment} onChange={setAssessment} />
      </label>
      <label className="field-card">
        <span className="field-label-row">Bake notes (optional)</span>
        <textarea
          rows={4}
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
          placeholder="What went well? Anything to adjust next time?"
        />
      </label>
      {saveError ? <p className="auth-modal__error">{saveError}</p> : null}
    </DialogCard>
  );
}
