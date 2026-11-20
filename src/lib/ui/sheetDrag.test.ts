import assert from 'node:assert/strict';
import test from 'node:test';

import { getSheetDragOffset, shouldDismissSheet } from './sheetDrag.ts';

test('a sheet only follows the finger downwards', () => {
  assert.equal(getSheetDragOffset(-40), 0);
  assert.equal(getSheetDragOffset(0), 0);
  assert.equal(getSheetDragOffset(120), 120);
});

test('a long drag down closes the sheet', () => {
  assert.equal(shouldDismissSheet({ offsetPx: 200, durationMs: 900, sheetHeightPx: 600 }), true);
});

test('a short, slow drag springs back', () => {
  assert.equal(shouldDismissSheet({ offsetPx: 40, durationMs: 600, sheetHeightPx: 600 }), false);
});

test('a quick flick down closes the sheet even if it did not travel far', () => {
  assert.equal(shouldDismissSheet({ offsetPx: 70, durationMs: 80, sheetHeightPx: 600 }), true);
});

test('a tiny quick twitch is not a dismissal', () => {
  assert.equal(shouldDismissSheet({ offsetPx: 15, durationMs: 10, sheetHeightPx: 600 }), false);
});

test('dragging up never closes the sheet', () => {
  assert.equal(shouldDismissSheet({ offsetPx: -300, durationMs: 50, sheetHeightPx: 600 }), false);
});

test('a drag with no time measured is judged by distance only', () => {
  assert.equal(shouldDismissSheet({ offsetPx: 100, durationMs: 0, sheetHeightPx: 600 }), false);
  assert.equal(shouldDismissSheet({ offsetPx: 250, durationMs: 0, sheetHeightPx: 600 }), true);
});
