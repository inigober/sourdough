import { hasLocalRecipesImportCompleted, markLocalRecipesImportCompleted } from './localRecipeImportStorage.ts';
import { clearAllSavedRecipes } from './recipeStorage.ts';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getDefaultStorage(): StorageLike {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available.');
  }

  return localStorage;
}

/** Marks migration complete and drops local recipe copies after they live in the cloud. */
export function finishCloudRecipeMigration(userId: string, storage: StorageLike = getDefaultStorage()): void {
  markLocalRecipesImportCompleted(userId, storage);
  clearAllSavedRecipes(storage);
}

/** Clears local recipes when a cloud user signs out so stale copies do not reappear. */
export function clearLocalRecipesOnSignOut(
  userId: string | undefined,
  storage: StorageLike = getDefaultStorage(),
): void {
  if (!userId || !hasLocalRecipesImportCompleted(userId, storage)) {
    return;
  }

  clearAllSavedRecipes(storage);
}
