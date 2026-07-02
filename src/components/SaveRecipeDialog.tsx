import { useEffect, useMemo, useState, type MouseEvent } from 'react';

import { findSavedRecipeSummaryByName } from '../lib/storage/recipeStorage.ts';
import type { SavedRecipeSummary } from '../lib/storage/types.ts';
import { DialogCard } from './DialogCard.tsx';

type SaveRecipeDialogProps = {
  defaultName: string;
  activeSavedRecipeId: string | null;
  savedRecipes: SavedRecipeSummary[];
  onCancel: () => void;
  onSave: (name: string, recipeId: string | null) => void | Promise<void>;
};

export function SaveRecipeDialog({
  defaultName,
  activeSavedRecipeId,
  savedRecipes,
  onCancel,
  onSave,
}: SaveRecipeDialogProps) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    setName(defaultName);
  }, [defaultName]);

  const resolvedName = name.trim() || defaultName;
  const updateRecipeId = useMemo(() => {
    if (activeSavedRecipeId) {
      return activeSavedRecipeId;
    }

    return findSavedRecipeSummaryByName(resolvedName, savedRecipes)?.id ?? null;
  }, [activeSavedRecipeId, resolvedName, savedRecipes]);
  const isUpdate = Boolean(updateRecipeId);

  function handleAction(event: MouseEvent<HTMLButtonElement>, action: () => void): void {
    event.stopPropagation();
    action();
  }

  return (
    <DialogCard
      title={isUpdate ? 'Update saved recipe' : 'Save recipe'}
      titleId="save-recipe-dialog-title"
      onClose={onCancel}
      actions={
        <div className="dialog-card__actions">
          <button
            type="button"
            className="wizard-button wizard-button--secondary"
            onClick={(event) => handleAction(event, onCancel)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="wizard-button wizard-button--primary"
            onClick={(event) =>
              handleAction(event, () => void onSave(resolvedName, updateRecipeId))
            }
          >
            {isUpdate ? 'Update recipe' : 'Save recipe'}
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
