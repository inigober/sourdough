import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from './defaults.ts';
import { formatBakeDateShort, getBakeDateIso, getTodayIsoDate } from './dates.ts';

test('default schedule has no calendar date until a bake starts', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);

  assert.equal(schedule.mixDate, '');
});

test('cold proof bake date is the day after mix date', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.mixDate = '2026-05-20';
  schedule.proofingStyle = 'cold';

  assert.equal(getBakeDateIso(schedule, defaultRecipeInput), '2026-05-21');
  assert.equal(formatBakeDateShort(getBakeDateIso(schedule, defaultRecipeInput)), '21 May');
});

test('getTodayIsoDate returns an ISO date string', () => {
  assert.match(getTodayIsoDate(new Date('2026-05-20T15:30:00')), /^2026-05-20$/);
});

test('cold proof bake date moves a day later when shaping finishes after midnight', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.mixDate = '2026-05-20';
  schedule.proofingStyle = 'cold';
  schedule.startTime = '20:00';
  schedule.desiredBakeTime = '08:00';

  // Bulk ends the next morning, so the fridge time runs to 08:00 the day after that.
  assert.equal(getBakeDateIso(schedule, defaultRecipeInput), '2026-05-22');
});
