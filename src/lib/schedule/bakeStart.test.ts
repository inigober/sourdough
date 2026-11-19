import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import {
  applyBakeStart,
  getBakeStartPastWarning,
  getBakeStartTiming,
  getDefaultBakeStart,
  getStartNowChoice,
  isBakeStartChoiceValid,
  PAST_START_GRACE_MINUTES,
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

// Symptom: a mix date 10 days in the past was accepted with no warning.
const now = new Date(2026, 4, 20, 14, 30, 20);

test('a start in the future is upcoming and gets no warning', () => {
  const later = { mixDate: '2026-05-20', startTime: '18:00' };

  assert.deepEqual(getBakeStartTiming(later, now), { status: 'upcoming' });
  assert.equal(getBakeStartPastWarning(later, now), null);
});

test('a start a few minutes ago is not scary: no warning inside the grace period', () => {
  const justPassed = { mixDate: '2026-05-20', startTime: '14:27' };

  assert.deepEqual(getBakeStartTiming(justPassed, now), { status: 'justNow' });
  assert.equal(getBakeStartPastWarning(justPassed, now), null);
});

test('the grace period ends after PAST_START_GRACE_MINUTES', () => {
  // now is 14:30:20, so 14:25 is 5m20s ago and 14:24 is 6m20s ago.
  assert.equal(PAST_START_GRACE_MINUTES, 5);
  assert.equal(getBakeStartTiming({ mixDate: '2026-05-20', startTime: '14:25' }, now).status, 'justNow');
  assert.equal(getBakeStartTiming({ mixDate: '2026-05-20', startTime: '14:24' }, now).status, 'past');
});

test('a start 10 days ago warns in days and points at Start now', () => {
  const tenDaysAgo = { mixDate: '2026-05-10', startTime: '14:30' };
  const warning = getBakeStartPastWarning(tenDaysAgo, now);

  assert.equal(getBakeStartTiming(tenDaysAgo, now).status, 'past');
  assert.match(warning ?? '', /10 days ago/);
  assert.match(warning ?? '', /Start now/);
});

test('past warnings say minutes, hours or days depending on how long ago', () => {
  assert.match(getBakeStartPastWarning({ mixDate: '2026-05-20', startTime: '14:00' }, now) ?? '', /30 minutes ago/);
  assert.match(getBakeStartPastWarning({ mixDate: '2026-05-20', startTime: '09:30' }, now) ?? '', /5 hours ago/);
  assert.match(getBakeStartPastWarning({ mixDate: '2026-05-19', startTime: '14:30' }, now) ?? '', /1 day ago/);
});

test('an incomplete choice gets no past warning (it is already invalid)', () => {
  assert.equal(getBakeStartPastWarning({ mixDate: '', startTime: '09:00' }, now), null);
  assert.equal(getBakeStartPastWarning({ mixDate: '2026-05-10', startTime: '' }, now), null);
});

test('getStartNowChoice uses today and the current clock time, which is never past', () => {
  const choice = getStartNowChoice(now);

  assert.deepEqual(choice, { mixDate: '2026-05-20', startTime: '14:30' });
  assert.equal(isBakeStartChoiceValid(choice), true);
  assert.equal(getBakeStartPastWarning(choice, now), null);
});

test('getStartNowChoice pads single-digit hours', () => {
  assert.equal(getStartNowChoice(new Date(2026, 0, 5, 7, 5)).startTime, '07:05');
});
