import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../../lib/recipe/defaults.ts';
import { validateRecipeInput } from '../../lib/recipe/validation.ts';
import { getWizardContinueEnabled } from './recipeBuilderSteps.ts';

function canContinueOnStep(recipeInput: typeof defaultRecipeInput, step: 'doughSize' | 'flour' | 'recipeTargets' | 'fermentation') {
  return getWizardContinueEnabled(validateRecipeInput(recipeInput), step);
}

test('blocking dough weight prevents Continue on dough size step', () => {
  assert.equal(
    canContinueOnStep({ ...defaultRecipeInput, finalDoughWeightGrams: 0 }, 'doughSize'),
    false,
  );
});

test('valid default recipe allows Continue on dough size step', () => {
  assert.equal(canContinueOnStep(defaultRecipeInput, 'doughSize'), true);
});

test('flour blend errors on flour step do not block dough size step', () => {
  const unevenBlend = {
    ...defaultRecipeInput,
    doughFlours: [
      { ...defaultRecipeInput.doughFlours[0], id: 'a', percent: 60 },
      { ...defaultRecipeInput.doughFlours[0], id: 'b', percent: 30 },
    ],
  };

  assert.equal(canContinueOnStep(unevenBlend, 'doughSize'), true);
  assert.equal(canContinueOnStep(unevenBlend, 'flour'), false);
});

test('blocking hydration prevents Continue on recipe targets step only', () => {
  const invalidHydration = { ...defaultRecipeInput, hydrationPercent: 0 };

  assert.equal(canContinueOnStep(invalidHydration, 'doughSize'), true);
  assert.equal(canContinueOnStep(invalidHydration, 'recipeTargets'), false);
});
