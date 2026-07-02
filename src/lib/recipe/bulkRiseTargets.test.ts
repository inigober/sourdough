import assert from 'node:assert/strict';
import test from 'node:test';

import { createFlourBlendEntry } from './flourBlend.ts';
import { getBulkRiseTargets } from './bulkRiseTargets.ts';
import { defaultRecipeInput } from './defaults.ts';

test('default white dough at 24C keeps a moderate 35-50% end-of-bulk target', () => {
  const targets = getBulkRiseTargets(defaultRecipeInput);

  assert.deepEqual(targets.endOfBulk, { low: 35, high: 50 });
});

test('cooler bulk temperature raises the target rise range', () => {
  const coolRoom = { ...defaultRecipeInput, roomTemperatureCelsius: 18 };
  const targets = getBulkRiseTargets(coolRoom);

  assert.deepEqual(targets.endOfBulk, { low: 55, high: 75 });
});

test('warmer bulk temperature lowers the target rise range', () => {
  const warmRoom = { ...defaultRecipeInput, roomTemperatureCelsius: 27 };
  const targets = getBulkRiseTargets(warmRoom);

  assert.deepEqual(targets.endOfBulk, { low: 25, high: 35 });
});

test('whole wheat blend lowers rise targets versus white flour', () => {
  const wholeWheat = {
    ...defaultRecipeInput,
    hydrationPercent: 87,
    doughFlours: [createFlourBlendEntry('wholeWheat', 100)],
  };
  const targets = getBulkRiseTargets(wholeWheat);

  assert.deepEqual(targets.endOfBulk, { low: 25, high: 35 });
});

test('rye blend uses a lower end-of-bulk range than white flour', () => {
  const ryeBlend = {
    ...defaultRecipeInput,
    hydrationPercent: 75,
    doughFlours: [
      createFlourBlendEntry('wheatType1050', 70),
      createFlourBlendEntry('wholeRye', 30),
    ],
  };
  const whiteTargets = getBulkRiseTargets(defaultRecipeInput);
  const targets = getBulkRiseTargets(ryeBlend);

  assert.ok(targets.endOfBulk.high < whiteTargets.endOfBulk.high);
  assert.ok(targets.endOfBulk.low < whiteTargets.endOfBulk.low);
});

test('very wet dough adds a spread note without changing the core range', () => {
  const wetDough = {
    ...defaultRecipeInput,
    hydrationPercent: 85,
    doughFlours: [createFlourBlendEntry('wheatType1050', 100)],
  };
  const targets = getBulkRiseTargets(wetDough);

  assert.deepEqual(targets.endOfBulk, { low: 35, high: 50 });
  assert.match(targets.spreadNote ?? '', /straight-sided/i);
});
