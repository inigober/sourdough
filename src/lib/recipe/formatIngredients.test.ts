import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateRecipe } from './calculateRecipe.ts';
import { defaultRecipeInput } from './defaults.ts';
import { buildIngredientRows, formatIngredientListAsText } from './formatIngredients.ts';

test('buildIngredientRows uses separate flour rows for blends', () => {
  const recipeInput = {
    ...defaultRecipeInput,
    doughFlours: [
      { ...defaultRecipeInput.doughFlours[0], id: 'a', flourType: 'wheatType1050' as const, percent: 70 },
      { ...defaultRecipeInput.doughFlours[0], id: 'b', flourType: 'wholeWheat' as const, percent: 30 },
    ],
  };
  const formula = calculateRecipe(recipeInput);
  const rows = buildIngredientRows(recipeInput, formula);

  assert.equal(rows.length, 5);
  assert.match(rows[0]?.[0] ?? '', /1050|Wheat/i);
  assert.equal(rows.some(([label]) => label === 'Added flour'), false);
});

test('ingredient rows add up to the dough weight, for a single flour and for a blend', () => {
  const blendInput = {
    ...defaultRecipeInput,
    doughFlours: [
      { ...defaultRecipeInput.doughFlours[0], id: 'a', flourType: 'wheatType1050' as const, percent: 70 },
      { ...defaultRecipeInput.doughFlours[0], id: 'b', flourType: 'wholeWheat' as const, percent: 30 },
    ],
  };

  for (const recipeInput of [defaultRecipeInput, blendInput]) {
    const rows = buildIngredientRows(recipeInput, calculateRecipe(recipeInput));
    const sum = rows.reduce((total, [, value]) => total + (typeof value === 'number' ? value : 0), 0);

    // Each row is rounded to a whole gram, so allow a few grams of rounding.
    assert.ok(
      Math.abs(sum - recipeInput.finalDoughWeightGrams) <= 3,
      `rows sum to ${sum}g but the dough weight is ${recipeInput.finalDoughWeightGrams}g`,
    );
  }
});

test('formatIngredientListAsText renders a copy-friendly ingredient block', () => {
  const formula = calculateRecipe(defaultRecipeInput);
  const rows = buildIngredientRows(defaultRecipeInput, formula);
  const text = formatIngredientListAsText({ recipeName: 'Country loaf', rows });

  assert.match(text, /^Country loaf/);
  assert.match(text, /Ingredients/);
  assert.match(text, /Added flour:/);
  assert.match(text, /Levain:/);
});
