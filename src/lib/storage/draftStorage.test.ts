import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import {
  BUILDER_DRAFT_STORAGE_KEY,
  clearBuilderDraft,
  getBuilderDraftSummary,
  isUntouchedBuilderState,
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

test('isUntouchedBuilderState is true only for the state the builder starts with', () => {
  const initial = { recipeInput: defaultRecipeInput, scheduleInput: createDefaultScheduleInput(defaultRecipeInput) };
  const untouched = {
    ...initial,
    hasCompletedWizard: false,
    editingFromResults: false,
    hasOpenedSchedule: false,
    activeSavedRecipeId: null,
  };

  assert.equal(isUntouchedBuilderState(untouched, initial), true);

  // Any real change makes it worth keeping as a draft.
  assert.equal(isUntouchedBuilderState({ ...untouched, recipeInput: { ...defaultRecipeInput } }, initial), false);
  assert.equal(isUntouchedBuilderState({ ...untouched, scheduleInput: { ...initial.scheduleInput } }, initial), false);
  assert.equal(isUntouchedBuilderState({ ...untouched, hasCompletedWizard: true }, initial), false);
  assert.equal(isUntouchedBuilderState({ ...untouched, editingFromResults: true }, initial), false);
  assert.equal(isUntouchedBuilderState({ ...untouched, hasOpenedSchedule: true }, initial), false);
  assert.equal(isUntouchedBuilderState({ ...untouched, activeSavedRecipeId: 'recipe-1' }, initial), false);
});
