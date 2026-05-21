import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import {
  BUILDER_DRAFT_STORAGE_KEY,
  clearBuilderDraft,
  getBuilderDraftSummary,
  loadBuilderDraft,
  saveBuilderDraft,
} from './draftStorage.ts';

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

test('save and load builder draft', () => {
  const storage = new MemoryStorage();

  saveBuilderDraft(
    {
      phase: 'results',
      currentStep: 'fermentation',
      hasCompletedWizard: true,
      editingFromResults: false,
      hasOpenedSchedule: false,
      recipeInput: defaultRecipeInput,
      scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
      activeSavedRecipeId: null,
    },
    storage,
  );

  const draft = loadBuilderDraft(storage);
  assert.ok(draft);
  assert.equal(draft.phase, 'results');
  assert.equal(getBuilderDraftSummary(storage)?.label, 'Ingredient summary');
});

test('clearBuilderDraft removes stored draft', () => {
  const storage = new MemoryStorage();
  saveBuilderDraft(
    {
      phase: 'schedule',
      currentStep: 'fermentation',
      hasCompletedWizard: true,
      editingFromResults: false,
      hasOpenedSchedule: true,
      recipeInput: defaultRecipeInput,
      scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
      activeSavedRecipeId: null,
    },
    storage,
  );

  clearBuilderDraft(storage);
  assert.equal(storage.getItem(BUILDER_DRAFT_STORAGE_KEY), null);
});
