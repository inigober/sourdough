import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTimerEndsAt,
  formatTimerRemaining,
  getTimerRemainingSeconds,
} from './bakeTimer.ts';

test('getTimerRemainingSeconds counts down to zero', () => {
  const now = Date.parse('2026-05-20T10:00:00.000Z');
  const endsAt = '2026-05-20T10:05:30.000Z';

  assert.equal(getTimerRemainingSeconds(endsAt, now), 330);
  assert.equal(getTimerRemainingSeconds(endsAt, Date.parse('2026-05-20T10:06:00.000Z')), 0);
  assert.equal(getTimerRemainingSeconds(null, now), null);
  assert.equal(getTimerRemainingSeconds('invalid', now), null);
});

test('formatTimerRemaining renders mm:ss and hh:mm:ss', () => {
  assert.equal(formatTimerRemaining(90), '1:30');
  assert.equal(formatTimerRemaining(3661), '1:01:01');
});

test('createTimerEndsAt adds duration from a fixed start time', () => {
  const from = Date.parse('2026-05-20T10:00:00.000Z');
  assert.equal(createTimerEndsAt(15, from), '2026-05-20T10:15:00.000Z');
});
