import assert from 'node:assert/strict';
import test from 'node:test';

import { describeResultCount } from './resultCount.ts';

test('counts are singular or plural', () => {
  assert.equal(describeResultCount(1, 'bake'), '1 bake shown');
  assert.equal(describeResultCount(3, 'bake'), '3 bakes shown');
});

test('an empty result says nothing matches', () => {
  assert.equal(describeResultCount(0, 'recipe'), 'No recipes match');
});

test('an irregular plural can be passed in', () => {
  assert.equal(describeResultCount(2, 'loaf', 'loaves'), '2 loaves shown');
});
