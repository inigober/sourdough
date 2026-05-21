import {
  hasLocalRecipesImportCompleted,
  markLocalRecipesImportCompleted,
} from './localRecipeImportStorage.ts';
import { listLocalSavedRecipes } from './recipeStorage.ts';
import { importRemoteSavedRecipe, listRemoteRecipeSummaries } from './remoteRecipeStorage.ts';

export async function importLocalRecipesIfNeeded(userId: string): Promise<{ imported: number }> {
  if (hasLocalRecipesImportCompleted(userId)) {
    return { imported: 0 };
  }

  const localRecipes = listLocalSavedRecipes();
  if (localRecipes.length === 0) {
    markLocalRecipesImportCompleted(userId);
    return { imported: 0 };
  }

  const remoteSummaries = await listRemoteRecipeSummaries(userId);
  const remoteIds = new Set(remoteSummaries.map((recipe) => recipe.id));

  let imported = 0;
  for (const recipe of localRecipes) {
    if (remoteIds.has(recipe.id)) {
      continue;
    }

    await importRemoteSavedRecipe(userId, recipe);
    imported += 1;
  }

  markLocalRecipesImportCompleted(userId);
  return { imported };
}
