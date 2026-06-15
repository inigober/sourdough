import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../../lib/recipe/defaults.ts';
import { createDefaultScheduleInput } from '../../lib/schedule/defaults.ts';
import type { SavedRecipe } from '../../lib/storage/types.ts';
import {
  canStartBakeFromSavedRecipe,
  getCompanionExitSessionAction,
  resolvePostSaveBakeFlowAction,
  resolveRecipeSaveName,
  shouldPromptSaveBeforeBake,
} from './bakeFlow.ts';

const scheduleInput = createDefaultScheduleInput(defaultRecipeInput);

const savedRecipe: SavedRecipe = {
  id: 'recipe-1',
  name: 'Country loaf',
  recipeInput: defaultRecipeInput,
  scheduleInput,
  savedAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
};

test('shouldPromptSaveBeforeBake requires a saved recipe id', () => {
  assert.equal(shouldPromptSaveBeforeBake(null), true);
  assert.equal(shouldPromptSaveBeforeBake('recipe-1'), false);
});

test('canStartBakeFromSavedRecipe requires a schedule', () => {
  assert.equal(canStartBakeFromSavedRecipe(savedRecipe), true);
  assert.equal(canStartBakeFromSavedRecipe({ ...savedRecipe, scheduleInput: undefined }), false);
  assert.equal(canStartBakeFromSavedRecipe(null), false);
});

test('resolveRecipeSaveName keeps an existing saved name or falls back to bread style', () => {
  assert.equal(resolveRecipeSaveName(savedRecipe, defaultRecipeInput, scheduleInput), 'Country loaf');
  assert.match(resolveRecipeSaveName(null, defaultRecipeInput, scheduleInput), /1050|Wheat/i);
});

test('getCompanionExitSessionAction clears finished bakes and stashes interrupted ones', () => {
  assert.equal(getCompanionExitSessionAction(true), 'clear');
  assert.equal(getCompanionExitSessionAction(false), 'stash');
});

test('resolvePostSaveBakeFlowAction prioritizes go-home over start-bake', () => {
  assert.equal(
    resolvePostSaveBakeFlowAction({
      pendingGoHomeAfterSave: true,
      pendingStartBakeAfterSave: true,
    }),
    'goHome',
  );
  assert.equal(
    resolvePostSaveBakeFlowAction({
      pendingGoHomeAfterSave: false,
      pendingStartBakeAfterSave: true,
    }),
    'startBake',
  );
  assert.equal(
    resolvePostSaveBakeFlowAction({
      pendingGoHomeAfterSave: false,
      pendingStartBakeAfterSave: false,
    }),
    'none',
  );
});
