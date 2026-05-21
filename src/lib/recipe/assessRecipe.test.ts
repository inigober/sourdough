import assert from 'node:assert/strict';
import test from 'node:test';

import { assessRecipe } from './assessRecipe.ts';
import { calculateRecipe } from './calculateRecipe.ts';
import { defaultRecipeInput } from './defaults.ts';

test('flags 90% hydration as high for Type 1050', () => {
  const input = {
    ...defaultRecipeInput,
    hydrationPercent: 90,
  };
  const sections = assessRecipe(input, calculateRecipe(input));

  assert.ok(
    sections.some(
      (section) =>
        section.title === 'High hydration for this flour' &&
        section.level === 'risk' &&
        section.shortMessage.includes('90%'),
    ),
  );
});

test('keeps default Type 1050 assessment concise', () => {
  const sections = assessRecipe(defaultRecipeInput, calculateRecipe(defaultRecipeInput));

  assert.equal(sections[0].title, 'Overall recipe shape');
  assert.equal(sections.some((section) => section.title === 'Hydration fits the flour'), false);
  assert.equal(sections.some((section) => section.title === 'Active levain'), false);
});

test('sleepy levain lowers fermentation confidence', () => {
  const input = {
    ...defaultRecipeInput,
    levainActivity: 'sleepy' as const,
  };
  const sections = assessRecipe(input, calculateRecipe(input));

  assert.ok(
    sections.some(
      (section) =>
        section.title === 'Low fermentation confidence' &&
        section.level === 'risk',
    ),
  );
});
