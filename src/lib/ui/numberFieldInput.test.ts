import assert from 'node:assert/strict';
import test from 'node:test';

import {
  commitNumberDraft,
  getValueWhileTyping,
  shouldHoldFieldMessage,
  stepWithinBounds,
} from './numberFieldInput.ts';

const hydrationBounds = { step: 1, min: 50, max: 110 };

// Symptom: typing 150 into hydration used to be clamped to 110 with no message.
test('keepOutOfRange passes a typed value above max through untouched', () => {
  assert.equal(getValueWhileTyping('150', hydrationBounds, true), 150);

  const committed = commitNumberDraft('150', hydrationBounds, true);
  assert.equal(committed.value, 150);
  assert.equal(committed.draft, '150');
});

test('legacy clamp mode still clamps typed values (schedule fields rely on it)', () => {
  assert.equal(getValueWhileTyping('150', hydrationBounds, false), 110);
  assert.equal(getValueWhileTyping('7', hydrationBounds, false), 50);
  assert.deepEqual(commitNumberDraft('150', hydrationBounds, false), { value: 110, draft: '110' });
});

// Symptom: clearing the weight field and leaving it silently became the minimum (50g).
test('keepOutOfRange reports a cleared field as NaN and keeps it empty', () => {
  assert.ok(Number.isNaN(getValueWhileTyping('', hydrationBounds, true) ?? 0));

  const committed = commitNumberDraft('', hydrationBounds, true);
  assert.ok(Number.isNaN(committed.value));
  assert.equal(committed.draft, '');
});

test('keepOutOfRange treats a lone minus or dot as no number, and keeps the text', () => {
  assert.ok(Number.isNaN(getValueWhileTyping('-', hydrationBounds, true) ?? 0));
  assert.equal(commitNumberDraft('.', hydrationBounds, true).draft, '.');
});

test('legacy clamp mode still turns a cleared field into the minimum on blur', () => {
  assert.deepEqual(commitNumberDraft('', hydrationBounds, false), { value: 50, draft: '50' });
  assert.equal(getValueWhileTyping('', hydrationBounds, false), null);
});

test('commit rounds to the step precision without clamping', () => {
  assert.deepEqual(commitNumberDraft('78.6', hydrationBounds, true), { value: 79, draft: '79' });
  assert.deepEqual(commitNumberDraft('1.94', { step: 0.1, min: 0, max: 4 }, true), {
    value: 1.9,
    draft: '1.9',
  });
});

test('stepping from a cleared field starts at the minimum instead of producing NaN', () => {
  assert.equal(stepWithinBounds(Number.NaN, 50, { step: 50, min: 50 }), 100);
  assert.equal(stepWithinBounds(Number.NaN, -50, { step: 50, min: 50 }), 50);
});

test('stepping from an out-of-range value lands back inside the range', () => {
  assert.equal(stepWithinBounds(150, -1, hydrationBounds), 110);
  assert.equal(stepWithinBounds(30, 1, hydrationBounds), 50);
});

test('messages wait until blur, except when the typed number is already above max', () => {
  assert.equal(shouldHoldFieldMessage({ isFocused: false, draft: '7', max: 110 }), false);
  assert.equal(shouldHoldFieldMessage({ isFocused: true, draft: '7', max: 110 }), true);
  assert.equal(shouldHoldFieldMessage({ isFocused: true, draft: '', max: 110 }), true);
  // More digits can never bring 150 back under 110, so say so right away.
  assert.equal(shouldHoldFieldMessage({ isFocused: true, draft: '150', max: 110 }), false);
  assert.equal(shouldHoldFieldMessage({ isFocused: true, draft: '150' }), true);
});
