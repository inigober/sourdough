import { DialogCard } from './DialogCard.tsx';

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <DialogCard
      title={title}
      titleId="confirm-dialog-title"
      messageId="confirm-dialog-message"
      role="alertdialog"
      onClose={onCancel}
      actions={
        <div className="dialog-card__actions">
          <button type="button" className="wizard-button wizard-button--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="wizard-button wizard-button--primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p id="confirm-dialog-message" className="dialog-card__message">
        {message}
      </p>
    </DialogCard>
  );
}
