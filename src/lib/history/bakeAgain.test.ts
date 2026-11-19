import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { buildBakeAgainStart } from './bakeAgain.ts';
import type { BakeHistorySession } from './types.ts';

function buildSession(overrides: Partial<BakeHistorySession> = {}): BakeHistorySession {
  return {
    id: 'bake-1',
    savedRecipeId: 'recipe-1',
    recipeName: 'Country loaf',
    recipeInput: { ...defaultRecipeInput, hydrationPercent: 74 },
    scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
    startedAt: '2026-05-01T08:00:00.000Z',
    completedAt: '2026-05-02T10:00:00.000Z',
    savedAt: '2026-05-02T10:00:00.000Z',
    updatedAt: '2026-05-02T10:00:00.000Z',
    steps: [],
    ...overrides,
  };
}

test('buildBakeAgainStart uses the recipe snapshot from that bake', () => {
  const start = buildBakeAgainStart(buildSession(), true);

  assert.equal(start.recipeName, 'Country loaf');
  assert.equal(start.recipeInput.hydrationPercent, 74);
  assert.equal(start.savedRecipeId, 'recipe-1');
});

test('buildBakeAgainStart drops the recipe link when the saved recipe is gone', () => {
  assert.equal(buildBakeAgainStart(buildSession(), false).savedRecipeId, null);
  assert.equal(buildBakeAgainStart(buildSession({ savedRecipeId: null }), true).savedRecipeId, null);
});

test('buildBakeAgainStart tolerates an older schedule shape', () => {
  const start = buildBakeAgainStart(
    buildSession({ scheduleInput: { mixDate: '2026-01-01', startTime: '08:00' } as never }),
    true,
  );

  assert.equal(typeof start.scheduleInput.includeStarterPrep, 'boolean');
  assert.equal(start.scheduleInput.startTime, '08:00');
});
