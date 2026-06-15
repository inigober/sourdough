import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearLocalRecipesOnSignOut,
  finishCloudRecipeMigration,
} from './cloudRecipeDeviceStorage.ts';
import { getLocalRecipesImportKey } from './localRecipeImportStorage.ts';
import { listSavedRecipeSummaries, upsertSavedRecipe } from './recipeStorage.ts';
import { defaultRecipeInput } from '../recipe/defaults.ts';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

test('finishCloudRecipeMigration clears local recipes and marks import complete', () => {
  const storage = new MemoryStorage();
  const userId = 'user-123';

  upsertSavedRecipe({ name: 'Local loaf', recipeInput: defaultRecipeInput }, storage);
  assert.equal(listSavedRecipeSummaries(storage).length, 1);

  finishCloudRecipeMigration(userId, storage);

  assert.equal(listSavedRecipeSummaries(storage).length, 0);
  assert.equal(storage.getItem(getLocalRecipesImportKey(userId)), 'true');
});

test('clearLocalRecipesOnSignOut clears local recipes only for migrated users', () => {
  const storage = new MemoryStorage();
  const userId = 'user-123';

  upsertSavedRecipe({ name: 'Local loaf', recipeInput: defaultRecipeInput }, storage);
  finishCloudRecipeMigration(userId, storage);
  upsertSavedRecipe({ name: 'Signed-out local loaf', recipeInput: defaultRecipeInput }, storage);
  assert.equal(listSavedRecipeSummaries(storage).length, 1);

  clearLocalRecipesOnSignOut(userId, storage);

  assert.equal(listSavedRecipeSummaries(storage).length, 0);
});

test('clearLocalRecipesOnSignOut is a no-op for users who never migrated', () => {
  const storage = new MemoryStorage();

  upsertSavedRecipe({ name: 'Local loaf', recipeInput: defaultRecipeInput }, storage);
  clearLocalRecipesOnSignOut('user-123', storage);

  assert.equal(listSavedRecipeSummaries(storage).length, 1);
});
