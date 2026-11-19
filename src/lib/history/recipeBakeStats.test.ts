import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRecipeBakeStats, formatRecipeBakeStats } from './recipeBakeStats.ts';
import type { BakeHistorySessionSummary } from './types.ts';

function entry(
  id: string,
  savedRecipeId: string | null | undefined,
  completedAt: string,
  overallAssessment?: BakeHistorySessionSummary['overallAssessment'],
): BakeHistorySessionSummary {
  return { id, savedRecipeId, recipeName: 'Loaf', completedAt, savedAt: completedAt, overallAssessment };
}

test('buildRecipeBakeStats counts bakes per recipe and keeps the latest assessment', () => {
  const stats = buildRecipeBakeStats([
    entry('a', 'r1', '2026-05-01T10:00:00.000Z', 'needsWork'),
    entry('b', 'r1', '2026-05-09T10:00:00.000Z', 'great'),
    entry('c', 'r1', '2026-05-03T10:00:00.000Z', 'ok'),
    entry('d', 'r2', '2026-05-02T10:00:00.000Z'),
  ]);

  assert.equal(stats.r1?.bakeCount, 3);
  assert.equal(stats.r1?.lastAssessment, 'great');
  assert.equal(stats.r2?.bakeCount, 1);
  assert.equal(stats.r2?.lastAssessment, undefined);
});

test('buildRecipeBakeStats skips bakes without a saved recipe', () => {
  const stats = buildRecipeBakeStats([
    entry('a', null, '2026-05-01T10:00:00.000Z', 'great'),
    entry('b', undefined, '2026-05-02T10:00:00.000Z'),
  ]);

  assert.deepEqual(stats, {});
});

test('last bake wins even when its assessment is unset', () => {
  const stats = buildRecipeBakeStats([
    entry('a', 'r1', '2026-05-01T10:00:00.000Z', 'great'),
    entry('b', 'r1', '2026-05-05T10:00:00.000Z'),
  ]);

  assert.equal(stats.r1?.lastAssessment, undefined);
  assert.equal(formatRecipeBakeStats(stats.r1!), 'Baked 2x');
});

test('formatRecipeBakeStats shows the count and last assessment label', () => {
  assert.equal(
    formatRecipeBakeStats({ bakeCount: 3, lastCompletedAt: '2026-05-01T10:00:00.000Z', lastAssessment: 'ok' }),
    'Baked 3x · last: OK',
  );
});
