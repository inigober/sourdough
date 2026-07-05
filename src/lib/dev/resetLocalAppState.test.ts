import assert from 'node:assert/strict';
import test from 'node:test';

import { NATIVE_BAKE_TIMER_PERMISSION_STORAGE_KEY } from '../companion/nativeBakeTimer/constants.ts';
import { BAKE_SESSION_STORAGE_KEY } from '../storage/bakeSessionStorage.ts';
import { BUILDER_DRAFT_STORAGE_KEY } from '../storage/draftStorage.ts';
import { getLocalRecipesImportKey } from '../storage/localRecipeImportStorage.ts';
import { SAVED_RECIPES_STORAGE_KEY } from '../storage/recipeStorage.ts';
import {
  describeLocalAppStateKey,
  listLocalAppStateKeys,
  resetLocalAppState,
} from './resetLocalAppState.ts';

class MemoryStorage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

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

test('listLocalAppStateKeys returns sourdough-owned keys only', () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVED_RECIPES_STORAGE_KEY, '[]');
  storage.setItem(BUILDER_DRAFT_STORAGE_KEY, '{}');
  storage.setItem(NATIVE_BAKE_TIMER_PERMISSION_STORAGE_KEY, '1');
  storage.setItem(getLocalRecipesImportKey('user-1'), 'true');
  storage.setItem('sb-project-auth-token', '{"access_token":"secret"}');
  storage.setItem('unrelated-key', 'keep');

  assert.deepEqual(listLocalAppStateKeys(storage), [
    NATIVE_BAKE_TIMER_PERMISSION_STORAGE_KEY,
    BUILDER_DRAFT_STORAGE_KEY,
    getLocalRecipesImportKey('user-1'),
    SAVED_RECIPES_STORAGE_KEY,
  ]);
});

test('resetLocalAppState removes sourdough keys and leaves other storage intact', () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVED_RECIPES_STORAGE_KEY, '[]');
  storage.setItem(BAKE_SESSION_STORAGE_KEY, '{}');
  storage.setItem('sb-project-auth-token', '{"access_token":"secret"}');
  storage.setItem('unrelated-key', 'keep');

  const removed = resetLocalAppState(storage);

  assert.deepEqual(removed.sort(), [BAKE_SESSION_STORAGE_KEY, SAVED_RECIPES_STORAGE_KEY].sort());
  assert.equal(storage.getItem(SAVED_RECIPES_STORAGE_KEY), null);
  assert.equal(storage.getItem(BAKE_SESSION_STORAGE_KEY), null);
  assert.equal(storage.getItem('sb-project-auth-token'), '{"access_token":"secret"}');
  assert.equal(storage.getItem('unrelated-key'), 'keep');
});

test('describeLocalAppStateKey maps known keys to readable labels', () => {
  assert.equal(describeLocalAppStateKey(SAVED_RECIPES_STORAGE_KEY), 'Saved recipes');
  assert.equal(describeLocalAppStateKey(BUILDER_DRAFT_STORAGE_KEY), 'Recipe builder draft');
  assert.equal(
    describeLocalAppStateKey(getLocalRecipesImportKey('user-1')),
    'Cloud recipe import flag',
  );
});
