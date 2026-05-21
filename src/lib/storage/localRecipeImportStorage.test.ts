import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearLocalRecipesImportCompleted,
  getLocalRecipesImportKey,
  hasLocalRecipesImportCompleted,
  markLocalRecipesImportCompleted,
} from './localRecipeImportStorage.ts';

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

test('local recipe import flag is tracked per user', () => {
  const storage = new MemoryStorage();
  const userId = 'user-123';

  assert.equal(getLocalRecipesImportKey(userId), 'sourdough:local-recipes-imported:user-123');
  assert.equal(hasLocalRecipesImportCompleted(userId, storage), false);

  markLocalRecipesImportCompleted(userId, storage);
  assert.equal(hasLocalRecipesImportCompleted(userId, storage), true);

  clearLocalRecipesImportCompleted(userId, storage);
  assert.equal(hasLocalRecipesImportCompleted(userId, storage), false);
});
