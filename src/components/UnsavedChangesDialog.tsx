import { DialogCard } from './DialogCard.tsx';
import type { MouseEvent } from 'react';

type UnsavedChangesDialogProps = {
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
  saveError?: string | null;
};

export function UnsavedChangesDialog({
  onCancel,
  onDiscard,
  onSave,
  saveError,
}: UnsavedChangesDialogProps) {
  function handleAction(event: MouseEvent<HTMLButtonElement>, action: () => void): void {
    event.stopPropagation();
    action();
  }

  return (
    <DialogCard
      title="Save changes?"
      titleId="unsaved-dialog-title"
      messageId="unsaved-dialog-message"
      role="alertdialog"
      onClose={onCancel}
      actions={
        <div className="dialog-card__actions dialog-card__actions--stack">
          <button
            type="button"
            className="wizard-button wizard-button--primary"
            onClick={(event) => handleAction(event, onSave)}
          >
            Save recipe
          </button>
          <button
            type="button"
            className="wizard-button wizard-button--secondary"
            onClick={(event) => handleAction(event, onDiscard)}
          >
            Discard changes
          </button>
          <button
            type="button"
            className="wizard-button wizard-button--secondary"
            onClick={(event) => handleAction(event, onCancel)}
          >
            Keep editing
          </button>
        </div>
      }
    >
      <p id="unsaved-dialog-message" className="dialog-card__message">
        You have unsaved changes. Save before leaving, or discard them.
      </p>
      {saveError ? (
        <p className="auth-modal__error" role="alert">
          {saveError}
        </p>
      ) : null}
    </DialogCard>
  );
}
