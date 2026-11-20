import assert from 'node:assert/strict';
import test from 'node:test';

import { getTrappedFocusIndex } from './focusTrap.ts';

test('Tab on the last element wraps to the first', () => {
  assert.equal(getTrappedFocusIndex(3, 4, false), 0);
});

test('Shift+Tab on the first element wraps to the last', () => {
  assert.equal(getTrappedFocusIndex(0, 4, true), 3);
});

test('Tab in the middle is left to the browser', () => {
  assert.equal(getTrappedFocusIndex(1, 4, false), null);
  assert.equal(getTrappedFocusIndex(2, 4, true), null);
});

test('focus outside the sheet is pulled back in', () => {
  assert.equal(getTrappedFocusIndex(-1, 4, false), 0);
  assert.equal(getTrappedFocusIndex(-1, 4, true), 3);
});

test('a sheet with one control keeps focus on it', () => {
  assert.equal(getTrappedFocusIndex(0, 1, false), 0);
  assert.equal(getTrappedFocusIndex(0, 1, true), 0);
});

test('a sheet with nothing focusable is left to the caller', () => {
  assert.equal(getTrappedFocusIndex(-1, 0, false), null);
});
