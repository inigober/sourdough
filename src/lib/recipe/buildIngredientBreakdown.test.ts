import assert from 'node:assert/strict';
import test from 'node:test';

import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { buildIngredientBreakdown } from './buildIngredientBreakdown.ts';
import { calculateRecipe } from './calculateRecipe.ts';
import { defaultRecipeInput } from './defaults.ts';
import { buildIngredientRows } from './formatIngredients.ts';

const blendRecipe = {
  ...defaultRecipeInput,
  doughFlours: [
    { ...defaultRecipeInput.doughFlours[0], id: 'a', flourType: 'wheatType1050' as const, percent: 70 },
    { ...defaultRecipeInput.doughFlours[0], id: 'b', flourType: 'wholeRye' as const, percent: 30 },
  ],
};

test('dough lines keep the amounts of the ingredient rows (they add up to the dough weight)', () => {
  const formula = calculateRecipe(blendRecipe);
  const breakdown = buildIngredientBreakdown(blendRecipe, formula);
  const rowGrams = buildIngredientRows(blendRecipe, formula).map(([, value]) => Number(value));

  assert.deepEqual(
    breakdown.dough.map((line) => line.grams),
    rowGrams,
  );
  const sum = breakdown.dough.reduce((total, line) => total + line.grams, 0);
  assert.ok(Math.abs(sum - blendRecipe.finalDoughWeightGrams) < 1.5);
});

test('dough lines are typed by what they are, with the flour named', () => {
  const formula = calculateRecipe(defaultRecipeInput);
  const { dough } = buildIngredientBreakdown(defaultRecipeInput, formula);

  assert.deepEqual(
    dough.map((line) => line.kind),
    ['flour', 'water', 'salt', 'levain'],
  );
  assert.equal(dough[0].label, 'Wheat Type 1050 flour');
});

test('a blend gets one flour line per flour, without doubling the word flour', () => {
  const formula = calculateRecipe(blendRecipe);
  const { dough } = buildIngredientBreakdown(blendRecipe, formula);

  assert.deepEqual(
    dough.filter((line) => line.kind === 'flour').map((line) => line.label),
    ['Wheat Type 1050 flour', 'Whole rye flour'],
  );
});

test('the levain build lists starter, flour and water that add up to the build total', () => {
  const formula = calculateRecipe(defaultRecipeInput);
  const { levain } = buildIngredientBreakdown(defaultRecipeInput, formula, createDefaultScheduleInput(defaultRecipeInput));

  assert.ok(levain.plan);
  assert.deepEqual(
    levain.plan.build.lines.map((line) => line.kind),
    ['starter', 'flour', 'water'],
  );
  assert.match(levain.plan.build.ratioLabel, /^1:\d+:\d+$/);
  // The build is bigger than the levain in the dough by the scrape-and-transfer buffer.
  assert.ok(levain.plan.build.totalGrams > levain.grams);
  assert.equal(levain.plan.bufferPercent, 15);
});

test('a fridge starter shows a refresh feeding, a room-temperature one does not', () => {
  const formula = calculateRecipe(defaultRecipeInput);
  const base = createDefaultScheduleInput(defaultRecipeInput);
  const fromFridge = buildIngredientBreakdown(defaultRecipeInput, formula, {
    ...base,
    starterFromFridge: true,
    levainBuildHours: 6,
  });
  const fresh = buildIngredientBreakdown(defaultRecipeInput, formula, { ...base, starterFromFridge: false });

  assert.equal(fresh.levain.plan?.refresh, null);
  assert.equal(fromFridge.levain.plan?.refresh?.ratioLabel, '1:3:3');
  assert.deepEqual(
    fromFridge.levain.plan?.refresh?.lines.map((line) => line.grams),
    [10, 30, 30],
  );
});

test('without starter prep only the levain in the dough is known', () => {
  const formula = calculateRecipe(defaultRecipeInput);
  const base = createDefaultScheduleInput(defaultRecipeInput);
  const { levain } = buildIngredientBreakdown(defaultRecipeInput, formula, { ...base, includeStarterPrep: false });

  assert.equal(levain.plan, null);
  assert.equal(levain.grams, formula.levainGrams);
});

test('totals include the flour and water inside the levain', () => {
  const formula = calculateRecipe(defaultRecipeInput);
  const { totals } = buildIngredientBreakdown(defaultRecipeInput, formula);

  assert.equal(totals.flourGrams, formula.totalFlourGrams);
  assert.equal(totals.waterGrams, formula.totalWaterGrams);
});
