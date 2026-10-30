import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import {
  applyBakeStart,
  getDefaultBakeStart,
  isBakeStartChoiceValid,
  previewBakeStart,
} from './bakeStart.ts';
import { createDefaultScheduleInput } from './defaults.ts';

test('default bake start is today when the usual start time is still ahead', () => {
  const morning = new Date(2026, 4, 20, 7, 30);

  assert.deepEqual(getDefaultBakeStart('09:00', morning), {
    mixDate: '2026-05-20',
    startTime: '09:00',
  });
});

test('default bake start is tomorrow once the usual start time has passed', () => {
  const evening = new Date(2026, 4, 20, 19, 0);

  assert.deepEqual(getDefaultBakeStart('09:00', evening), {
    mixDate: '2026-05-21',
    startTime: '09:00',
  });
});

test('applyBakeStart sets the real date and time without touching the recipe schedule', () => {
  const recipeSchedule = createDefaultScheduleInput(defaultRecipeInput);
  const session = applyBakeStart(recipeSchedule, { mixDate: '2026-05-20', startTime: '10:30' });

  assert.equal(session.mixDate, '2026-05-20');
  assert.equal(session.startTime, '10:30');
  assert.equal(recipeSchedule.mixDate, '');
  assert.equal(session.autolyseMinutes, recipeSchedule.autolyseMinutes);
});

test('isBakeStartChoiceValid rejects a cleared date or time', () => {
  assert.equal(isBakeStartChoiceValid({ mixDate: '2026-05-20', startTime: '09:00' }), true);
  assert.equal(isBakeStartChoiceValid({ mixDate: '', startTime: '09:00' }), false);
  assert.equal(isBakeStartChoiceValid({ mixDate: '2026-05-20', startTime: '' }), false);
});

test('previewBakeStart shows first step, mix, and oven times for the chosen start', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = false;
  schedule.autolyseEnabled = false;
  schedule.proofingStyle = 'cold';
  schedule.desiredBakeTime = '08:00';

  const preview = previewBakeStart(schedule, defaultRecipeInput, {
    mixDate: '2026-05-20',
    startTime: '09:00',
  });

  assert.ok(preview.mix?.endsWith('09:00'));
  assert.ok(preview.oven?.endsWith('08:00'));
  assert.notEqual(preview.mix?.split(',')[0], preview.oven?.split(',')[0]);
  assert.equal(preview.firstStep?.when, preview.mix);
});

test('previewBakeStart puts starter prep before the mix', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = true;
  schedule.starterFromFridge = false;

  const preview = previewBakeStart(schedule, defaultRecipeInput, {
    mixDate: '2026-05-20',
    startTime: '09:00',
  });

  assert.match(preview.firstStep?.label ?? '', /Build levain/);
  assert.notEqual(preview.firstStep?.when, preview.mix);
});
