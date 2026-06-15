import { finishCloudRecipeMigration } from './cloudRecipeDeviceStorage.ts';
import { hasLocalRecipesImportCompleted } from './localRecipeImportStorage.ts';
import { listLocalSavedRecipes } from './recipeStorage.ts';
import { importRemoteSavedRecipe, listRemoteRecipeSummaries } from './remoteRecipeStorage.ts';
import type { SavedRecipe, SavedRecipeSummary } from './types.ts';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getDefaultStorage(): StorageLike {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available.');
  }

  return localStorage;
}

export type ImportLocalRecipesOptions = {
  storage?: StorageLike;
  listRemoteSummaries?: (userId: string) => Promise<SavedRecipeSummary[]>;
  importRecipe?: (userId: string, recipe: SavedRecipe) => Promise<void>;
};

export async function importLocalRecipesIfNeeded(
  userId: string,
  options: ImportLocalRecipesOptions = {},
): Promise<{ imported: number }> {
  const storage = options.storage ?? getDefaultStorage();
  const listRemoteSummaries = options.listRemoteSummaries ?? listRemoteRecipeSummaries;
  const importRecipe = options.importRecipe ?? importRemoteSavedRecipe;
  const localRecipes = listLocalSavedRecipes(storage);

  if (localRecipes.length === 0) {
    if (!hasLocalRecipesImportCompleted(userId, storage)) {
      finishCloudRecipeMigration(userId, storage);
    }

    return { imported: 0 };
  }

  const remoteSummaries = await listRemoteSummaries(userId);
  const remoteIds = new Set(remoteSummaries.map((recipe) => recipe.id));

  let imported = 0;
  for (const recipe of localRecipes) {
    if (remoteIds.has(recipe.id)) {
      continue;
    }

    await importRecipe(userId, recipe);
    imported += 1;
  }

  finishCloudRecipeMigration(userId, storage);
  return { imported };
}
