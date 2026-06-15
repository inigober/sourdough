import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { applyStepScheduleEdit, getStepScheduleEdit } from './stepScheduleEdits.ts';

test('getStepScheduleEdit resolves direct and merged step ids', () => {
  assert.equal(getStepScheduleEdit('autolyse')?.scheduleField, 'autolyseMinutes');
  assert.equal(getStepScheduleEdit('mix-levain-rest-after-levain')?.scheduleField, 'restAfterLevainMinutes');
  assert.equal(getStepScheduleEdit('stretch-fold-2')?.scheduleField, 'stretchAndFoldRestMinutes');
  assert.equal(getStepScheduleEdit('coil-fold-1')?.scheduleField, 'coilFoldRestMinutes');
  assert.equal(getStepScheduleEdit('unknown-step'), null);
});

test('applyStepScheduleEdit updates the matching schedule field', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  const edit = getStepScheduleEdit('autolyse');
  assert.ok(edit);

  const updated = applyStepScheduleEdit(schedule, edit, 45);
  assert.equal(updated.autolyseMinutes, 45);
  assert.equal(schedule.autolyseMinutes, createDefaultScheduleInput(defaultRecipeInput).autolyseMinutes);
});
