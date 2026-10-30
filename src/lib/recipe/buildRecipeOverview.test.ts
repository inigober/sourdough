import assert from 'node:assert/strict';
import test from 'node:test';

import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { buildRecipeOverview, formatStepDuration } from './buildRecipeOverview.ts';
import { defaultRecipeInput } from './defaults.ts';

test('overview lists ingredients and levain amounts for the in-dough levain', () => {
  const overview = buildRecipeOverview(defaultRecipeInput, createDefaultScheduleInput(defaultRecipeInput));
  const levainLabels = overview.levainRows.map(([label]) => label);

  assert.ok(overview.ingredientRows.some(([label]) => label === 'Levain'));
  assert.equal(levainLabels[0], 'Levain in the dough');
  assert.ok(levainLabels.some((label) => label.startsWith('Build levain (1:')));
  assert.match(overview.doughSummary, /loaf/);
});

test('overview shows a refresh step for fridge starter when the plan has one', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.starterFromFridge = true;
  schedule.levainBuildHours = 4;

  const overview = buildRecipeOverview(defaultRecipeInput, schedule);

  assert.ok(overview.levainRows.some(([label]) => label === 'Refresh starter first'));

  // A long build folds the refresh into one big feeding, so no separate step is listed.
  schedule.levainBuildHours = 12;
  const folded = buildRecipeOverview(defaultRecipeInput, schedule);

  assert.ok(!folded.levainRows.some(([label]) => label === 'Refresh starter first'));
});

test('overview omits build steps when starter prep is off', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = false;

  const overview = buildRecipeOverview(defaultRecipeInput, schedule);

  assert.equal(overview.levainRows.length, 2);
});

test('overview groups the schedule by bake day and has no schedule for bare recipes', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.proofingStyle = 'cold';

  const withSchedule = buildRecipeOverview(defaultRecipeInput, schedule);
  const withoutSchedule = buildRecipeOverview(defaultRecipeInput, undefined);

  assert.ok(withSchedule.schedule);
  assert.equal(withSchedule.schedule.days.at(-1)?.label, 'Bake day');
  assert.equal(withSchedule.schedule.mixDaySummary, 'Mix on bake day −1');
  assert.equal(withoutSchedule.schedule, null);
  assert.ok(withoutSchedule.levainRows.length > 0);
});

test('overview returns no amounts when the recipe cannot be calculated', () => {
  const overview = buildRecipeOverview({ ...defaultRecipeInput, finalDoughWeightGrams: 0 }, undefined);

  assert.deepEqual(overview.ingredientRows, []);
  assert.deepEqual(overview.levainRows, []);
});

test('formatStepDuration is compact', () => {
  assert.equal(formatStepDuration(0), null);
  assert.equal(formatStepDuration(45), '45 min');
  assert.equal(formatStepDuration(120), '2 h');
  assert.equal(formatStepDuration(150), '2 h 30 min');
});
