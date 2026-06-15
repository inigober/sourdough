import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from './defaults.ts';
import { normalizeScheduleInput } from './normalizeScheduleInput.ts';
import type { ScheduleInput } from './types.ts';

test('normalizeScheduleInput fills missing schedule with defaults', () => {
  const normalized = normalizeScheduleInput(undefined, defaultRecipeInput);
  const defaults = createDefaultScheduleInput(defaultRecipeInput);

  assert.equal(normalized.mixDate, defaults.mixDate);
  assert.equal(normalized.levainBuildHours, defaults.levainBuildHours);
  assert.equal(normalized.includeStarterPrep, defaults.includeStarterPrep);
});

test('normalizeScheduleInput keeps explicit overrides', () => {
  const base = createDefaultScheduleInput(defaultRecipeInput);
  const partial: ScheduleInput = {
    ...base,
    starterFromFridge: true,
    autolyseMinutes: 50,
  };

  const normalized = normalizeScheduleInput(partial, defaultRecipeInput);

  assert.equal(normalized.autolyseMinutes, 50);
  assert.equal(normalized.starterFromFridge, true);
});
