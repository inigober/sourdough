import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from './defaults.ts';
import { isRecipeDirty } from './isRecipeDirty.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import type { SavedRecipe } from '../storage/types.ts';

const scheduleInput = createDefaultScheduleInput(defaultRecipeInput);

const savedRecipe: SavedRecipe = {
  id: 'recipe-1',
  name: 'Country loaf',
  recipeInput: defaultRecipeInput,
  scheduleInput,
  savedAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
};

function dirtyState(
  overrides: Partial<Parameters<typeof isRecipeDirty>[0]> = {},
): Parameters<typeof isRecipeDirty>[0] {
  return {
    phase: 'wizard',
    currentStep: 'doughSize',
    recipeInput: defaultRecipeInput,
    scheduleInput,
    hasOpenedSchedule: false,
    hasCompletedWizard: false,
    activeSavedRecipe: null,
    ...overrides,
  };
}

test('isRecipeDirty ignores companion and welcome screens', () => {
  assert.equal(isRecipeDirty(dirtyState({ phase: 'companion' })), false);
  assert.equal(isRecipeDirty(dirtyState({ currentStep: 'welcome' })), false);
});

test('isRecipeDirty tracks unsaved wizard progress', () => {
  assert.equal(isRecipeDirty(dirtyState()), true);
  assert.equal(isRecipeDirty(dirtyState({ hasCompletedWizard: true })), true);
  assert.equal(isRecipeDirty(dirtyState({ phase: 'results', currentStep: 'welcome' })), true);
});

test('isRecipeDirty compares saved recipes and schedules', () => {
  assert.equal(isRecipeDirty(dirtyState({ activeSavedRecipe: savedRecipe })), false);

  assert.equal(
    isRecipeDirty(
      dirtyState({
        activeSavedRecipe: savedRecipe,
        recipeInput: { ...defaultRecipeInput, hydrationPercent: 78 },
      }),
    ),
    true,
  );

  assert.equal(
    isRecipeDirty(
      dirtyState({
        activeSavedRecipe: savedRecipe,
        hasOpenedSchedule: true,
        scheduleInput: { ...scheduleInput, autolyseMinutes: 60 },
      }),
    ),
    true,
  );
});
