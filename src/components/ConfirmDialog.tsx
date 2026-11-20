import { DialogCard } from './DialogCard.tsx';

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  /** Deleting or discarding something: the confirm button is shown in the danger colour. */
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  destructive = false,
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
          <button type="button" className="button button--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={destructive ? 'button button--danger' : 'button button--primary'}
            onClick={onConfirm}
          >
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
