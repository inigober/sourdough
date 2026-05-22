import assert from 'node:assert/strict';
import test from 'node:test';

import { formatNumberDraft, stepNumberValue } from './numberFieldStep.ts';

test('stepping down by 0.1 keeps one decimal place without float noise', () => {
  let value = 2;

  for (let index = 0; index < 5; index += 1) {
    value = stepNumberValue(value, -0.1, 0.1);
  }

  assert.equal(value, 1.5);
  assert.equal(formatNumberDraft(value, 0.1), '1.5');
});

test('stepping salt from 2.0 down reaches 1.9 cleanly', () => {
  const next = stepNumberValue(2, -0.1, 0.1);

  assert.equal(next, 1.9);
  assert.equal(formatNumberDraft(next, 0.1), '1.9');
  assert.equal(String(next).includes('9999'), false);
});

test('integer steps stay whole numbers', () => {
  assert.equal(stepNumberValue(3, 1, 1), 4);
  assert.equal(formatNumberDraft(4, 1), '4');
});
