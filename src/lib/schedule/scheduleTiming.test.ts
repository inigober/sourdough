import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from './defaults.ts';
import {
  getBulkStartOffset,
  getColdRetardHours,
  parseTimeToMinutes,
  roundColdRetardHoursUp,
} from './scheduleTiming.ts';

test('parseTimeToMinutes parses clock times and falls back to 09:00', () => {
  assert.equal(parseTimeToMinutes('08:30'), 8 * 60 + 30);
  assert.equal(parseTimeToMinutes('bad'), 9 * 60);
});

test('getBulkStartOffset includes autolyse when enabled', () => {
  const withAutolyse = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    autolyseEnabled: true,
    autolyseMinutes: 40,
  };
  const withoutAutolyse = {
    ...withAutolyse,
    autolyseEnabled: false,
  };

  assert.equal(getBulkStartOffset(withAutolyse), 40);
  assert.equal(getBulkStartOffset(withoutAutolyse), 0);
});

test('roundColdRetardHoursUp rounds partial hours up', () => {
  assert.equal(roundColdRetardHoursUp(11.1), 12);
  assert.equal(roundColdRetardHoursUp(11), 11);
});

test('getColdRetardHours derives overnight hours from shape end and bake time', () => {
  const schedule = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    startTime: '09:00',
    desiredBakeTime: '09:00',
    autolyseEnabled: false,
  };

  const hours = getColdRetardHours(schedule, {
    ...defaultRecipeInput,
    targetBulkHours: 6,
  });

  assert.equal(hours, 18);
});
