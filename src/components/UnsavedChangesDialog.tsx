import { DialogCard } from './DialogCard.tsx';
import { runDialogButtonAction } from './dialogAction.ts';

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
            onClick={(event) => runDialogButtonAction(event, onSave)}
          >
            Save recipe
          </button>
          <button
            type="button"
            className="wizard-button wizard-button--secondary"
            onClick={(event) => runDialogButtonAction(event, onDiscard)}
          >
            Discard changes
          </button>
          <button
            type="button"
            className="wizard-button wizard-button--secondary"
            onClick={(event) => runDialogButtonAction(event, onCancel)}
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
