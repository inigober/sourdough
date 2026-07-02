import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateRecipe, estimatePrefermentedFlourPercent } from './calculateRecipe.ts';
import { defaultRecipeInput } from './defaults.ts';

test('calculates the default 900g Type 1050 recipe', () => {
  const formula = calculateRecipe(defaultRecipeInput);

  assert.equal(formula.totalFlourGrams, 494.5);
  assert.equal(formula.totalWaterGrams, 395.6);
  assert.equal(formula.saltGrams, 9.9);
  assert.equal(formula.prefermentedFlourPercent, 9.5);
  assert.equal(formula.levainFlourGrams, 47);
  assert.equal(formula.levainWaterGrams, 47);
  assert.equal(formula.levainGrams, 94);
  assert.equal(formula.addedFlourGrams, 447.5);
  assert.equal(formula.addedWaterGrams, 348.6);
  assert.equal(formula.perLoafDoughWeightGrams, 900);
  assert.deepEqual(formula.estimatedBakedLoafWeightGrams, { low: 765, high: 810 });
});

test('60% levain hydration contributes more flour than water', () => {
  const formula = calculateRecipe({
    ...defaultRecipeInput,
    levainType: 'stiffLevain',
    levainHydrationPercent: 60,
  });

  assert.equal(formula.levainWaterGrams, 28.2);
  assert.equal(formula.levainFlourGrams, 47);
  assert.equal(formula.levainGrams, 75.2);
});

test('140% levain hydration contributes more water than flour', () => {
  const formula = calculateRecipe({
    ...defaultRecipeInput,
    levainType: 'liquidLevain',
    levainHydrationPercent: 140,
  });

  assert.equal(formula.levainWaterGrams, 65.8);
  assert.equal(formula.levainFlourGrams, 47);
  assert.equal(formula.levainGrams, 112.7);
});

test('multiple loaves divide dough weight correctly', () => {
  const formula = calculateRecipe({
    ...defaultRecipeInput,
    finalDoughWeightGrams: 1800,
    numberOfLoaves: 2,
  });

  assert.equal(formula.perLoafDoughWeightGrams, 900);
  assert.deepEqual(formula.estimatedBakedLoafWeightGrams, { low: 765, high: 810 });
});

test('warmer room temperature lowers prefermented flour estimate', () => {
  const coolRoom = estimatePrefermentedFlourPercent({
    ...defaultRecipeInput,
    roomTemperatureCelsius: 22,
  });
  const warmRoom = estimatePrefermentedFlourPercent({
    ...defaultRecipeInput,
    roomTemperatureCelsius: 26,
  });

  assert.ok(warmRoom < coolRoom);
});

test('blocking validation issues prevent calculation', () => {
  assert.throws(() =>
    calculateRecipe({
      ...defaultRecipeInput,
      finalDoughWeightGrams: 0,
    }),
  );
});
