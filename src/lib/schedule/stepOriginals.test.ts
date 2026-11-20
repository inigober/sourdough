import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from './defaults.ts';
import { collectOriginals, restoreOriginals } from './stepOriginals.ts';
import type { ScheduleInput } from './types.ts';

const base = createDefaultScheduleInput(defaultRecipeInput);

test('collects the previous value of each setting an edit changed, and nothing else', () => {
  const after: ScheduleInput = { ...base, restAfterSaltMinutes: 50, autolyseMinutes: 60 };
  assert.deepEqual(collectOriginals(base, after), {
    restAfterSaltMinutes: base.restAfterSaltMinutes,
    autolyseMinutes: base.autolyseMinutes,
  });
});

test('an edit that changed nothing collects nothing', () => {
  assert.deepEqual(collectOriginals(base, { ...base }), {});
});

test('a second edit keeps the earliest original, so undo goes back to the start', () => {
  const first = { ...base, restAfterSaltMinutes: 50 };
  const second = { ...first, restAfterSaltMinutes: 70 };
  const originals = collectOriginals(first, second, collectOriginals(base, first));
  assert.deepEqual(originals, { restAfterSaltMinutes: base.restAfterSaltMinutes });
});

test('restoring puts the earlier values back and leaves other settings alone', () => {
  const edited: ScheduleInput = { ...base, restAfterSaltMinutes: 50, finishMinutes: 99 };
  const restored = restoreOriginals(edited, { restAfterSaltMinutes: base.restAfterSaltMinutes });
  assert.equal(restored.restAfterSaltMinutes, base.restAfterSaltMinutes);
  assert.equal(restored.finishMinutes, 99);
});

test('per-fold overrides are tracked one fold at a time', () => {
  const afterFold1: ScheduleInput = { ...base, foldRestMinutesByStep: { 'stretch-fold-1': 45 } };
  const afterFold2: ScheduleInput = { ...afterFold1, foldRestMinutesByStep: { 'stretch-fold-1': 45, 'stretch-fold-2': 20 } };

  const originalsFold1 = collectOriginals(base, afterFold1);
  const originalsFold2 = collectOriginals(afterFold1, afterFold2);

  const undoFold1 = restoreOriginals(afterFold2, originalsFold1);
  assert.deepEqual(undoFold1.foldRestMinutesByStep, { 'stretch-fold-2': 20 });

  const undoFold2 = restoreOriginals(afterFold2, originalsFold2);
  assert.deepEqual(undoFold2.foldRestMinutesByStep, { 'stretch-fold-1': 45 });
});

test('undoing the only fold override removes the map again, so the schedule looks untouched', () => {
  const edited: ScheduleInput = { ...base, foldRestMinutesByStep: { 'coil-fold-2': 40 } };
  const restored = restoreOriginals(edited, collectOriginals(base, edited));
  assert.equal('foldRestMinutesByStep' in restored && restored.foldRestMinutesByStep !== undefined, false);
});

test('a fold override that replaced an earlier override restores that earlier value', () => {
  const before: ScheduleInput = { ...base, foldRestMinutesByStep: { 'stretch-fold-1': 40 } };
  const after: ScheduleInput = { ...base, foldRestMinutesByStep: { 'stretch-fold-1': 55 } };
  const restored = restoreOriginals(after, collectOriginals(before, after));
  assert.deepEqual(restored.foldRestMinutesByStep, { 'stretch-fold-1': 40 });
});
