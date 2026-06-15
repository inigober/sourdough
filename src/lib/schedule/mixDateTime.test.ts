import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from './defaults.ts';
import { formatClockTime, formatOffsetDateTime, getMixDateTime } from './mixDateTime.ts';

test('getMixDateTime combines mix date, start time, and drift', () => {
  const schedule = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    mixDate: '2026-05-20',
    startTime: '08:30',
  };

  const mixStart = getMixDateTime(schedule, 15);
  assert.equal(formatClockTime(mixStart), '08:45');
});

test('formatOffsetDateTime labels later days separately from mix day', () => {
  const schedule = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    mixDate: '2026-05-20',
    startTime: '20:00',
  };

  const sameDay = formatOffsetDateTime(schedule, 60);
  const nextDay = formatOffsetDateTime(schedule, 12 * 60);

  assert.equal(sameDay.dateLabel, null);
  assert.ok(nextDay.dateLabel);
  assert.match(nextDay.iso, /^2026-05-21/);
});
