import { DialogCard } from '../../components/DialogCard.tsx';

type BakeCompleteDialogProps = {
  recipeName: string;
  onClose: () => void;
};

export function BakeCompleteDialog({ recipeName, onClose }: BakeCompleteDialogProps) {
  return (
    <DialogCard
      title="Bake complete"
      titleId="bake-complete-title"
      messageId="bake-complete-message"
      variant="success"
      onClose={onClose}
      actions={
        <div className="dialog-card__actions dialog-card__actions--stack">
          <button type="button" className="wizard-button wizard-button--primary" onClick={onClose}>
            Back to home
          </button>
        </div>
      }
    >
      <p id="bake-complete-message" className="dialog-card__message">
        Nice work finishing <strong>{recipeName}</strong>. Your loaf is ready to cool and enjoy.
      </p>
    </DialogCard>
  );
}
