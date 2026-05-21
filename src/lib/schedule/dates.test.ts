import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from './defaults.ts';
import { formatBakeDateShort, getBakeDateIso, getTodayIsoDate, getTomorrowIsoDate } from './dates.ts';

test('default schedule mix date is tomorrow', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  const tomorrow = getTomorrowIsoDate();

  assert.equal(schedule.mixDate, tomorrow);
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
