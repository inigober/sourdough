import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { SaveRecipeDialog } from '../../components/SaveRecipeDialog.tsx';
import { UnsavedChangesDialog } from '../../components/UnsavedChangesDialog.tsx';
import type { SavedRecipeSummary } from '../../lib/storage/types.ts';

type RecipeBuilderDialogsProps = {
  isUnsavedDialogOpen: boolean;
  onCancelUnsaved: () => void;
  onDiscardUnsaved: () => void;
  onSaveBeforeLeaving: () => void;
  isSaveDialogOpen: boolean;
  saveDialogDefaultName: string;
  activeSavedRecipeId: string | null;
  onCancelSave: () => void;
  onConfirmSave: (name: string) => void;
  pendingDeleteRecipe: SavedRecipeSummary | undefined;
  useCloudRecipes: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
};

export function RecipeBuilderDialogs({
  isUnsavedDialogOpen,
  onCancelUnsaved,
  onDiscardUnsaved,
  onSaveBeforeLeaving,
  isSaveDialogOpen,
  saveDialogDefaultName,
  activeSavedRecipeId,
  onCancelSave,
  onConfirmSave,
  pendingDeleteRecipe,
  useCloudRecipes,
  onCancelDelete,
  onConfirmDelete,
}: RecipeBuilderDialogsProps) {
  return (
    <>
      {isUnsavedDialogOpen ? (
        <UnsavedChangesDialog
          onCancel={onCancelUnsaved}
          onDiscard={onDiscardUnsaved}
          onSave={onSaveBeforeLeaving}
        />
      ) : null}
      {isSaveDialogOpen ? (
        <SaveRecipeDialog
          defaultName={saveDialogDefaultName}
          title={activeSavedRecipeId ? 'Update saved recipe' : 'Save recipe'}
          submitLabel={activeSavedRecipeId ? 'Update recipe' : 'Save recipe'}
          onCancel={onCancelSave}
          onSave={(name) => void onConfirmSave(name)}
        />
      ) : null}
      {pendingDeleteRecipe ? (
        <ConfirmDialog
          title="Delete saved recipe?"
          message={`"${pendingDeleteRecipe.name}" will be removed${useCloudRecipes ? ' from your account' : ' from this device'}.`}
          confirmLabel="Delete recipe"
          onCancel={onCancelDelete}
          onConfirm={() => void onConfirmDelete()}
        />
      ) : null}
    </>
  );
}
