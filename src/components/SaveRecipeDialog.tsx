import { useEffect, useState } from 'react';

import { DialogCard } from './DialogCard.tsx';

type SaveRecipeDialogProps = {
  defaultName: string;
  title: string;
  submitLabel: string;
  onCancel: () => void;
  onSave: (name: string) => void | Promise<void>;
};

export function SaveRecipeDialog({
  defaultName,
  title,
  submitLabel,
  onCancel,
  onSave,
}: SaveRecipeDialogProps) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    setName(defaultName);
  }, [defaultName]);

  return (
    <DialogCard
      title={title}
      titleId="save-recipe-dialog-title"
      onClose={onCancel}
      actions={
        <div className="dialog-card__actions">
          <button type="button" className="wizard-button wizard-button--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="wizard-button wizard-button--primary"
            onClick={() => void onSave(name.trim() || defaultName)}
          >
            {submitLabel}
          </button>
        </div>
      }
    >
      <label className="field-card">
        <span className="field-label-row">Recipe name</span>
        <input
          type="text"
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.currentTarget.value)}
        />
      </label>
    </DialogCard>
  );
}
