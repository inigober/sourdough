import assert from 'node:assert/strict';
import test from 'node:test';

import { createBakeSession } from '../companion/bakeSession.ts';
import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import {
  BAKE_SESSION_STORAGE_KEY,
  clearBakeSession,
  loadBakeSession,
  saveBakeSession,
} from './bakeSessionStorage.ts';

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

test('save and load bake session normalizes schedule defaults', () => {
  const storage = new MemoryStorage();
  const session = createBakeSession({
    savedRecipeId: 'recipe-1',
    recipeName: 'Test loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
  });

  saveBakeSession(session, storage);
  const loaded = loadBakeSession(storage);

  assert.ok(loaded);
  assert.equal(loaded.id, session.id);
  assert.equal(loaded.scheduleDriftMinutes, 0);
  assert.equal(loaded.coachQuestionsAsked, 0);
  assert.deepEqual(loaded.stepLogs, []);
});

test('loadBakeSession ignores corrupt payloads', () => {
  const storage = new MemoryStorage();
  storage.setItem(BAKE_SESSION_STORAGE_KEY, '{not json');

  assert.equal(loadBakeSession(storage), null);
});

test('clearBakeSession removes stored session', () => {
  const storage = new MemoryStorage();
  saveBakeSession(
    createBakeSession({
      savedRecipeId: null,
      recipeName: 'Temp',
      recipeInput: defaultRecipeInput,
      scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
    }),
    storage,
  );

  clearBakeSession(storage);
  assert.equal(loadBakeSession(storage), null);
});
