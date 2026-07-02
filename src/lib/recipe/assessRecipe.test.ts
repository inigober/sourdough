import assert from 'node:assert/strict';
import test from 'node:test';

import { assessRecipe } from './assessRecipe.ts';
import { calculateRecipe } from './calculateRecipe.ts';
import { createFlourBlendEntry } from './flourBlend.ts';
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

test('does not flag Type 1050 at its nominal high band when handling is moderate', () => {
  const input = {
    ...defaultRecipeInput,
    hydrationPercent: 83,
  };
  const sections = assessRecipe(input, calculateRecipe(input));

  assert.equal(
    sections.some((section) => section.title === 'High hydration for this flour'),
    false,
  );
});

test('flags Type 1050 above its flour-adjusted high band', () => {
  const input = {
    ...defaultRecipeInput,
    hydrationPercent: 84,
  };
  const sections = assessRecipe(input, calculateRecipe(input));

  assert.ok(
    sections.some(
      (section) =>
        section.title === 'High hydration for this flour' &&
        section.shortMessage.includes('handles like ~81%'),
    ),
  );
});

test('flags whole wheat only when effective handling crosses the adjusted band', () => {
  const moderate = {
    ...defaultRecipeInput,
    hydrationPercent: 87,
    doughFlours: [createFlourBlendEntry('wholeWheat', 100)],
  };
  const high = {
    ...defaultRecipeInput,
    hydrationPercent: 90,
    doughFlours: [createFlourBlendEntry('wholeWheat', 100)],
  };

  assert.equal(
    assessRecipe(moderate, calculateRecipe(moderate)).some(
      (section) => section.title === 'High hydration for this flour',
    ),
    false,
  );
  assert.ok(
    assessRecipe(high, calculateRecipe(high)).some(
      (section) => section.title === 'High hydration for this flour',
    ),
  );
});

test('includes target dough rise adjusted for recipe inputs', () => {
  const sections = assessRecipe(defaultRecipeInput, calculateRecipe(defaultRecipeInput));
  const riseSection = sections.find((section) => section.title === 'Target dough rise');

  assert.ok(riseSection);
  assert.equal(riseSection?.level, 'info');
  assert.match(riseSection?.shortMessage ?? '', /35–50%/);
  assert.match(riseSection?.details ?? '', /24°C bulk temperature/i);
});

test('whole wheat recipe gets a lower target dough rise in assessment', () => {
  const input = {
    ...defaultRecipeInput,
    hydrationPercent: 87,
    doughFlours: [createFlourBlendEntry('wholeWheat', 100)],
  };
  const riseSection = assessRecipe(input, calculateRecipe(input)).find(
    (section) => section.title === 'Target dough rise',
  );

  assert.match(riseSection?.shortMessage ?? '', /25–35%/);
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
