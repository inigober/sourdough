import assert from 'node:assert/strict';
import test from 'node:test';

import { createFlourBlendEntry } from './flourBlend.ts';
import { defaultRecipeInput } from './defaults.ts';
import {
  describeEffectiveHydration,
  getEffectiveHighHydrationThreshold,
  getEffectiveHydrationPercent,
  isHighEffectiveHydration,
} from './hydrationEquivalent.ts';

test('wholegrain flour lowers effective hydration versus nominal', () => {
  const wholeWheatDough = {
    ...defaultRecipeInput,
    hydrationPercent: 87,
    doughFlours: [createFlourBlendEntry('wholeWheat', 100)],
  };

  assert.equal(getEffectiveHydrationPercent(wholeWheatDough), 80);
});

test('high-extraction wheat lowers effective hydration moderately', () => {
  const highExtraction = {
    ...defaultRecipeInput,
    hydrationPercent: 83,
    doughFlours: [createFlourBlendEntry('wheatType1050', 100)],
  };

  assert.equal(getEffectiveHydrationPercent(highExtraction), 80);
});

test('white flour keeps effective hydration aligned with nominal', () => {
  const whiteDough = {
    ...defaultRecipeInput,
    hydrationPercent: 80,
    doughFlours: [createFlourBlendEntry('wheatType550', 100)],
  };

  assert.equal(getEffectiveHydrationPercent(whiteDough), 80);
});

test('describeEffectiveHydration explains meaningful adjustments', () => {
  const wholeWheatDough = {
    ...defaultRecipeInput,
    hydrationPercent: 87,
    doughFlours: [createFlourBlendEntry('wholeWheat', 100)],
  };

  const description = describeEffectiveHydration(wholeWheatDough);
  assert.ok(description);
  assert.match(description ?? '', /~80%/);
});

test('getEffectiveHighHydrationThreshold shifts the flour band into handling terms', () => {
  const type1050 = {
    ...defaultRecipeInput,
    doughFlours: [createFlourBlendEntry('wheatType1050', 100)],
  };
  const wholeWheat = {
    ...defaultRecipeInput,
    doughFlours: [createFlourBlendEntry('wholeWheat', 100)],
  };

  assert.equal(getEffectiveHighHydrationThreshold(type1050), 80);
  assert.equal(getEffectiveHighHydrationThreshold(wholeWheat), 82);
});

test('isHighEffectiveHydration compares handling against the flour-adjusted band', () => {
  const type1050AtBand = {
    ...defaultRecipeInput,
    hydrationPercent: 83,
    doughFlours: [createFlourBlendEntry('wheatType1050', 100)],
  };
  const type1050AboveBand = {
    ...defaultRecipeInput,
    hydrationPercent: 84,
    doughFlours: [createFlourBlendEntry('wheatType1050', 100)],
  };
  const wholeWheatBelowBand = {
    ...defaultRecipeInput,
    hydrationPercent: 87,
    doughFlours: [createFlourBlendEntry('wholeWheat', 100)],
  };
  const wholeWheatAboveBand = {
    ...defaultRecipeInput,
    hydrationPercent: 90,
    doughFlours: [createFlourBlendEntry('wholeWheat', 100)],
  };

  assert.equal(isHighEffectiveHydration(type1050AtBand), false);
  assert.equal(isHighEffectiveHydration(type1050AboveBand), true);
  assert.equal(isHighEffectiveHydration(wholeWheatBelowBand), false);
  assert.equal(isHighEffectiveHydration(wholeWheatAboveBand), true);
});
