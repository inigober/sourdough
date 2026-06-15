import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { getLocalRecipesImportKey } from './localRecipeImportStorage.ts';
import { importLocalRecipesIfNeeded } from './importLocalRecipes.ts';
import { listLocalSavedRecipes, listSavedRecipeSummaries, upsertSavedRecipe } from './recipeStorage.ts';
import type { SavedRecipe, SavedRecipeSummary } from './types.ts';

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

function createLocalRecipe(id: string, name: string, storage: MemoryStorage): SavedRecipe {
  return upsertSavedRecipe({ id, name, recipeInput: defaultRecipeInput }, storage);
}

function toSummary(recipe: SavedRecipe): SavedRecipeSummary {
  return {
    id: recipe.id,
    name: recipe.name,
    breadStyle: 'Test loaf',
    bakeDateLabel: 'Tomorrow',
    hasSchedule: false,
    savedAt: recipe.savedAt,
    updatedAt: recipe.updatedAt,
  };
}

test('importLocalRecipesIfNeeded marks migration complete when there are no local recipes', async () => {
  const storage = new MemoryStorage();
  const userId = 'user-123';

  const result = await importLocalRecipesIfNeeded(userId, {
    storage,
    listRemoteSummaries: async () => [],
  });

  assert.equal(result.imported, 0);
  assert.equal(storage.getItem(getLocalRecipesImportKey(userId)), 'true');
});

test('importLocalRecipesIfNeeded skips migration when local is empty and import already completed', async () => {
  const storage = new MemoryStorage();
  const userId = 'user-123';
  storage.setItem(getLocalRecipesImportKey(userId), 'true');

  const result = await importLocalRecipesIfNeeded(userId, {
    storage,
    listRemoteSummaries: async () => [],
  });

  assert.equal(result.imported, 0);
});

test('importLocalRecipesIfNeeded uploads only recipes missing from the cloud', async () => {
  const storage = new MemoryStorage();
  const userId = 'user-123';
  const localOnly = createLocalRecipe('local-only', 'Local only', storage);
  const shared = createLocalRecipe('shared', 'Shared loaf', storage);
  const importedIds: string[] = [];

  const result = await importLocalRecipesIfNeeded(userId, {
    storage,
    listRemoteSummaries: async () => [toSummary(shared)],
    importRecipe: async (_userId, recipe) => {
      importedIds.push(recipe.id);
    },
  });

  assert.equal(result.imported, 1);
  assert.deepEqual(importedIds, [localOnly.id]);
  assert.equal(listLocalSavedRecipes(storage).length, 0);
  assert.equal(storage.getItem(getLocalRecipesImportKey(userId)), 'true');
});

test('importLocalRecipesIfNeeded finishes migration without uploads when cloud already has every recipe', async () => {
  const storage = new MemoryStorage();
  const userId = 'user-123';
  const first = createLocalRecipe('recipe-a', 'Recipe A', storage);
  const second = createLocalRecipe('recipe-b', 'Recipe B', storage);
  let importCalls = 0;

  const result = await importLocalRecipesIfNeeded(userId, {
    storage,
    listRemoteSummaries: async () => [toSummary(first), toSummary(second)],
    importRecipe: async () => {
      importCalls += 1;
    },
  });

  assert.equal(result.imported, 0);
  assert.equal(importCalls, 0);
  assert.equal(listSavedRecipeSummaries(storage).length, 0);
});
