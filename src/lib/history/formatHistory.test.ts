import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatDriftMinutes,
  formatHistoryDate,
  formatHistoryDateTime,
  formatHistoryTimeRange,
  getStartDriftMinutes,
} from './formatHistory.ts';

test('formatHistoryDate handles invalid input', () => {
  assert.equal(formatHistoryDate('not-a-date'), 'Unknown date');
});

test('formatHistoryDateTime handles invalid input', () => {
  assert.equal(formatHistoryDateTime(''), 'Unknown time');
});

test('formatHistoryTimeRange handles invalid input', () => {
  assert.equal(formatHistoryTimeRange('bad', 'also-bad'), '—');
});

test('formatHistoryTimeRange uses clock times on the same day', () => {
  const range = formatHistoryTimeRange('2026-05-20T10:00:00.000Z', '2026-05-20T12:30:00.000Z');
  assert.match(range, /–/);
  assert.doesNotMatch(range, /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
});

test('formatHistoryTimeRange includes dates when the bake spans days', () => {
  const range = formatHistoryTimeRange('2026-05-20T22:00:00.000Z', '2026-05-21T08:00:00.000Z');
  assert.match(range, /–/);
  assert.notEqual(range, '—');
});

test('formatDriftMinutes formats signed durations', () => {
  assert.equal(formatDriftMinutes(0), '0m');
  assert.equal(formatDriftMinutes(15), '+15m');
  assert.equal(formatDriftMinutes(-90), '−1h 30m');
  assert.equal(formatDriftMinutes(120), '+2h');
});

test('getStartDriftMinutes rounds to the nearest minute', () => {
  assert.equal(getStartDriftMinutes(undefined, '2026-05-20T10:00:00.000Z'), null);
  assert.equal(
    getStartDriftMinutes('2026-05-20T10:00:00.000Z', '2026-05-20T10:15:00.000Z'),
    15,
  );
  assert.equal(
    getStartDriftMinutes('2026-05-20T10:00:00.000Z', '2026-05-20T09:45:00.000Z'),
    -15,
  );
});
