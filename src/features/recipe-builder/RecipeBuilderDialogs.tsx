import { ConfirmDialog } from '../../components/ConfirmDialog.tsx';
import { SaveRecipeDialog } from '../../components/SaveRecipeDialog.tsx';
import { UnsavedChangesDialog } from '../../components/UnsavedChangesDialog.tsx';
import type { SavedRecipeSummary } from '../../lib/storage/types.ts';

type RecipeBuilderDialogsProps = {
  isUnsavedDialogOpen: boolean;
  unsavedSaveError: string | null;
  onCancelUnsaved: () => void;
  onDiscardUnsaved: () => void;
  onSaveBeforeLeaving: () => void;
  pendingOverwriteBakeName: string | null;
  onCancelOverwriteBake: () => void;
  onConfirmOverwriteBake: () => void;
  isSaveDialogOpen: boolean;
  saveDialogDefaultName: string;
  activeSavedRecipeId: string | null;
  savedRecipes: SavedRecipeSummary[];
  onCancelSave: () => void;
  onConfirmSave: (name: string, recipeId: string | null) => void;
  pendingDeleteRecipe: SavedRecipeSummary | undefined;
  useCloudRecipes: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
};

export function RecipeBuilderDialogs({
  isUnsavedDialogOpen,
  unsavedSaveError,
  onCancelUnsaved,
  onDiscardUnsaved,
  onSaveBeforeLeaving,
  pendingOverwriteBakeName,
  onCancelOverwriteBake,
  onConfirmOverwriteBake,
  isSaveDialogOpen,
  saveDialogDefaultName,
  activeSavedRecipeId,
  savedRecipes,
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
          saveError={unsavedSaveError}
        />
      ) : null}
      {pendingOverwriteBakeName ? (
        <ConfirmDialog
          title="Replace in-progress bake?"
          message={`You already have "${pendingOverwriteBakeName}" in progress. Starting a new bake will replace it.`}
          confirmLabel="Start new bake"
          onCancel={onCancelOverwriteBake}
          onConfirm={onConfirmOverwriteBake}
        />
      ) : null}
      {isSaveDialogOpen ? (
        <SaveRecipeDialog
          defaultName={saveDialogDefaultName}
          activeSavedRecipeId={activeSavedRecipeId}
          savedRecipes={savedRecipes}
          onCancel={onCancelSave}
          onSave={(name, recipeId) => void onConfirmSave(name, recipeId)}
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
