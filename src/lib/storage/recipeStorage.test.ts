import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import {
  deleteSavedRecipe,
  duplicateSavedRecipe,
  findSavedRecipeSummaryByName,
  generateDefaultRecipeName,
  getSavedRecipe,
  listSavedRecipeSummaries,
  toSavedRecipeSummary,
  upsertSavedRecipe,
} from './recipeStorage.ts';

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

test('generateDefaultRecipeName uses bread style only', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.mixDate = '2026-05-20';

  assert.equal(generateDefaultRecipeName(defaultRecipeInput, schedule), 'dark wheat moderate hydration');
});

test('findSavedRecipeSummaryByName matches names case-insensitively', () => {
  const storage = new MemoryStorage();
  const created = upsertSavedRecipe(
    {
      name: 'Weekend Loaf',
      recipeInput: defaultRecipeInput,
    },
    storage,
  );
  const summaries = listSavedRecipeSummaries(storage);

  assert.equal(findSavedRecipeSummaryByName('weekend loaf', summaries)?.id, created.id);
  assert.equal(findSavedRecipeSummaryByName('  Weekend Loaf  ', summaries)?.id, created.id);
  assert.equal(findSavedRecipeSummaryByName('Other loaf', summaries), undefined);
});

test('upsertSavedRecipe creates and updates saved recipes', () => {
  const storage = new MemoryStorage();

  const created = upsertSavedRecipe(
    {
      name: 'Weekend loaf',
      recipeInput: defaultRecipeInput,
    },
    storage,
  );

  assert.equal(created.name, 'Weekend loaf');
  assert.equal(listSavedRecipeSummaries(storage).length, 1);

  const updated = upsertSavedRecipe(
    {
      id: created.id,
      name: 'Updated loaf',
      recipeInput: { ...defaultRecipeInput, hydrationPercent: 78 },
      scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
    },
    storage,
  );

  assert.equal(updated.id, created.id);
  assert.equal(updated.name, 'Updated loaf');
  assert.equal(updated.recipeInput.hydrationPercent, 78);
  assert.ok(updated.scheduleInput);
  assert.equal(getSavedRecipe(created.id, storage)?.updatedAt, updated.updatedAt);
});

test('duplicateSavedRecipe creates a copy with a new id', () => {
  const storage = new MemoryStorage();
  const original = upsertSavedRecipe(
    {
      name: 'Weekend loaf',
      recipeInput: defaultRecipeInput,
    },
    storage,
  );

  const duplicate = duplicateSavedRecipe(original.id, storage);

  assert.ok(duplicate);
  assert.notEqual(duplicate.id, original.id);
  assert.equal(duplicate.name, 'dark wheat moderate hydration');
  assert.equal(listSavedRecipeSummaries(storage).length, 2);
});

test('deleteSavedRecipe removes a saved recipe', () => {
  const storage = new MemoryStorage();
  const saved = upsertSavedRecipe(
    {
      name: 'To delete',
      recipeInput: defaultRecipeInput,
    },
    storage,
  );

  assert.equal(deleteSavedRecipe(saved.id, storage), true);
  assert.equal(getSavedRecipe(saved.id, storage), null);
  assert.equal(deleteSavedRecipe(saved.id, storage), false);
});

test('readSavedRecipes ignores corrupt storage payloads', () => {
  const storage = new MemoryStorage();
  storage.setItem('sourdough:saved-recipes:v1', '{not json');

  assert.deepEqual(listSavedRecipeSummaries(storage), []);
});
