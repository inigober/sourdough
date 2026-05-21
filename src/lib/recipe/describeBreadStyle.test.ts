import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from './defaults.ts';
import { describeBreadStyle } from './describeBreadStyle.ts';
import { createFlourBlendEntry } from './flourBlend.ts';

test('describeBreadStyle combines flour and hydration character', () => {
  assert.equal(describeBreadStyle(defaultRecipeInput), 'dark wheat moderate hydration');

  assert.equal(
    describeBreadStyle({
      ...defaultRecipeInput,
      hydrationPercent: 84,
    }),
    'dark wheat high hydration',
  );

  assert.equal(
    describeBreadStyle({
      ...defaultRecipeInput,
      doughFlours: [createFlourBlendEntry('pizzaFlour', 100)],
      hydrationPercent: 65,
    }),
    'pizza',
  );
});
