import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import type { ScheduleInput } from '../schedule/types.ts';
import type { BuilderDraft } from './draftStorage.ts';
import { decideBuilderDraftRestore, resolveRestoredDraftState } from './restoreBuilderDraft.ts';
import type { SavedRecipe } from './types.ts';

function makeDraft(overrides: Partial<BuilderDraft> = {}): BuilderDraft {
  return {
    version: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
    phase: 'wizard',
    currentStep: 'flour',
    hasCompletedWizard: false,
    editingFromResults: false,
    hasOpenedSchedule: false,
    recipeInput: { ...defaultRecipeInput, finalDoughWeightGrams: 1234 },
    scheduleInput: { ...createDefaultScheduleInput(defaultRecipeInput), mixDate: '2026-02-03' },
    activeSavedRecipeId: null,
    ...overrides,
  };
}

function makeSavedRecipe(id: string): SavedRecipe {
  return {
    id,
    name: 'Saved loaf',
    recipeInput: defaultRecipeInput,
    savedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const readyToRestore = {
  startedOnBuilderRoute: true,
  isBuilderUntouched: true,
  isAuthLoading: false,
};

test('restores a stored draft when the page loaded on a builder route with an untouched builder', () => {
  const draft = makeDraft();
  assert.deepEqual(decideBuilderDraftRestore({ ...readyToRestore, draft }), { action: 'restore', draft });
});

test('never restores when the page loaded outside the builder (Home keeps its Resume card)', () => {
  assert.deepEqual(
    decideBuilderDraftRestore({ ...readyToRestore, startedOnBuilderRoute: false, draft: makeDraft() }),
    { action: 'skip' },
  );
});

test('does not overwrite work the baker already started in memory', () => {
  assert.deepEqual(
    decideBuilderDraftRestore({ ...readyToRestore, isBuilderUntouched: false, draft: makeDraft() }),
    { action: 'skip' },
  );
});

test('skips when there is no stored draft', () => {
  assert.deepEqual(decideBuilderDraftRestore({ ...readyToRestore, draft: null }), { action: 'skip' });
});

test('waits for sign-in to settle only when the draft is linked to a saved recipe', () => {
  const linked = makeDraft({ activeSavedRecipeId: 'recipe-1' });
  assert.deepEqual(decideBuilderDraftRestore({ ...readyToRestore, isAuthLoading: true, draft: linked }), {
    action: 'wait',
  });

  const unlinked = makeDraft();
  assert.deepEqual(decideBuilderDraftRestore({ ...readyToRestore, isAuthLoading: true, draft: unlinked }), {
    action: 'restore',
    draft: unlinked,
  });
});

test('a skip beats a wait: no point waiting for sign-in when nothing will be restored', () => {
  assert.deepEqual(
    decideBuilderDraftRestore({
      ...readyToRestore,
      startedOnBuilderRoute: false,
      isAuthLoading: true,
      draft: makeDraft({ activeSavedRecipeId: 'recipe-1' }),
    }),
    { action: 'skip' },
  );
});

test('resolveRestoredDraftState carries the draft over and drops the calendar date', () => {
  const draft = makeDraft({ hasCompletedWizard: true, editingFromResults: true, hasOpenedSchedule: true });
  const state = resolveRestoredDraftState(draft, null);

  assert.equal(state.recipeInput, draft.recipeInput);
  assert.equal(state.scheduleInput.mixDate, '');
  assert.equal(state.hasCompletedWizard, true);
  assert.equal(state.editingFromResults, true);
  assert.equal(state.hasOpenedSchedule, true);
  assert.equal(state.activeSavedRecipeId, null);
  assert.equal(state.activeSavedRecipe, null);
});

test('resolveRestoredDraftState keeps the link when the saved recipe was found', () => {
  const saved = makeSavedRecipe('recipe-1');
  const state = resolveRestoredDraftState(makeDraft({ activeSavedRecipeId: 'recipe-1' }), saved);

  assert.equal(state.activeSavedRecipeId, 'recipe-1');
  assert.equal(state.activeSavedRecipe, saved);
});

test('resolveRestoredDraftState drops only the link when the saved recipe is gone', () => {
  const draft = makeDraft({ activeSavedRecipeId: 'deleted-recipe' });
  const state = resolveRestoredDraftState(draft, null);

  assert.equal(state.activeSavedRecipeId, null);
  assert.equal(state.activeSavedRecipe, null);
  // The baker's work is untouched.
  assert.equal(state.recipeInput, draft.recipeInput);
});

test('resolveRestoredDraftState fills fields missing from an older draft shape', () => {
  const olderSchedule: Partial<ScheduleInput> = { ...createDefaultScheduleInput(defaultRecipeInput) };
  delete olderSchedule.levainBuildHours;
  const draft = makeDraft({ scheduleInput: olderSchedule as ScheduleInput });

  const state = resolveRestoredDraftState(draft, null);
  assert.equal(typeof state.scheduleInput.levainBuildHours, 'number');
});
