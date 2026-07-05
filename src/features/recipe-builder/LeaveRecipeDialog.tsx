import { useEffect, useMemo, useState } from 'react';

import { DialogCard } from '../../components/DialogCard.tsx';
import { findSavedRecipeSummaryByName } from '../../lib/storage/recipeStorage.ts';
import type { SavedRecipeSummary } from '../../lib/storage/types.ts';

type LeaveRecipeDialogProps = {
  mode: 'unsaved' | 'save';
  saveDialogDefaultName: string;
  activeSavedRecipeId: string | null;
  savedRecipes: SavedRecipeSummary[];
  unsavedSaveError: string | null;
  isSavingExistingRecipe: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSaveBeforeLeaving: () => void;
  onConfirmSave: (name: string, recipeId: string | null) => void;
};

export function LeaveRecipeDialog({
  mode,
  saveDialogDefaultName,
  activeSavedRecipeId,
  savedRecipes,
  unsavedSaveError,
  isSavingExistingRecipe,
  onCancel,
  onDiscard,
  onSaveBeforeLeaving,
  onConfirmSave,
}: LeaveRecipeDialogProps) {
  const [name, setName] = useState(saveDialogDefaultName);

  useEffect(() => {
    if (mode === 'save') {
      setName(saveDialogDefaultName);
    }
  }, [mode, saveDialogDefaultName]);

  const resolvedName = name.trim() || saveDialogDefaultName;
  const updateRecipeId = useMemo(() => {
    if (activeSavedRecipeId) {
      return activeSavedRecipeId;
    }

    return findSavedRecipeSummaryByName(resolvedName, savedRecipes)?.id ?? null;
  }, [activeSavedRecipeId, resolvedName, savedRecipes]);
  const isUpdate = Boolean(updateRecipeId);

  const title =
    mode === 'unsaved' ? 'Save changes?' : isUpdate ? 'Update saved recipe' : 'Save recipe';

  return (
    <DialogCard
      title={title}
      titleId="leave-recipe-dialog-title"
      messageId={mode === 'unsaved' ? 'leave-recipe-dialog-message' : undefined}
      role="alertdialog"
      onClose={onCancel}
      actions={
        mode === 'unsaved' ? (
          <div className="dialog-card__actions dialog-card__actions--stack">
            <button
              type="button"
              className="wizard-button wizard-button--primary"
              disabled={isSavingExistingRecipe}
              onClick={onSaveBeforeLeaving}
            >
              {isSavingExistingRecipe ? 'Saving…' : 'Save recipe'}
            </button>
            <button
              type="button"
              className="wizard-button wizard-button--secondary"
              disabled={isSavingExistingRecipe}
              onClick={onDiscard}
            >
              Discard changes
            </button>
            <button
              type="button"
              className="wizard-button wizard-button--secondary"
              disabled={isSavingExistingRecipe}
              onClick={onCancel}
            >
              Keep editing
            </button>
          </div>
        ) : (
          <div className="dialog-card__actions">
            <button
              type="button"
              className="wizard-button wizard-button--secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="wizard-button wizard-button--primary"
              onClick={() => void onConfirmSave(resolvedName, updateRecipeId)}
            >
              {isUpdate ? 'Update recipe' : 'Save recipe'}
            </button>
          </div>
        )
      }
    >
      {mode === 'unsaved' ? (
        <>
          <p id="leave-recipe-dialog-message" className="dialog-card__message">
            You have unsaved changes. Save before leaving, or discard them.
          </p>
          {unsavedSaveError ? (
            <p className="auth-modal__error" role="alert">
              {unsavedSaveError}
            </p>
          ) : null}
        </>
      ) : (
        <label className="field-card">
          <span className="field-label-row">Recipe name</span>
          <input
            type="text"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.currentTarget.value)}
          />
        </label>
      )}
    </DialogCard>
  );
}
