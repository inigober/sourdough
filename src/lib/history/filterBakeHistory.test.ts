import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HISTORY_SEARCH_MIN_BAKES,
  filterBakeHistoryEntries,
  shouldShowHistorySearch,
} from './filterBakeHistory.ts';
import type { BakeHistorySessionSummary } from './types.ts';

const entries: BakeHistorySessionSummary[] = [
  {
    id: '1',
    recipeName: 'Country loaf',
    completedAt: '2026-05-01T10:00:00.000Z',
    savedAt: '2026-05-01T10:05:00.000Z',
    overallAssessment: 'great',
    overallNotePreview: 'Strong oven spring',
  },
  {
    id: '2',
    recipeName: 'Rye blend',
    completedAt: '2026-04-20T10:00:00.000Z',
    savedAt: '2026-04-20T10:05:00.000Z',
    overallAssessment: 'needsWork',
    overallNotePreview: 'Under proofed',
  },
  {
    id: '3',
    recipeName: 'Pizza dough',
    completedAt: '2026-04-10T10:00:00.000Z',
    savedAt: '2026-04-10T10:05:00.000Z',
  },
];

test('filterBakeHistoryEntries matches recipe names and note previews', () => {
  assert.deepEqual(filterBakeHistoryEntries(entries, 'oven', 'all').map((entry) => entry.id), ['1']);
  assert.deepEqual(filterBakeHistoryEntries(entries, 'rye', 'all').map((entry) => entry.id), ['2']);
});

test('filterBakeHistoryEntries filters by assessment', () => {
  assert.deepEqual(filterBakeHistoryEntries(entries, '', 'great').map((entry) => entry.id), ['1']);
  assert.deepEqual(filterBakeHistoryEntries(entries, '', 'unset').map((entry) => entry.id), ['3']);
});

test('search and filter appear only once the history holds enough bakes', () => {
  assert.equal(HISTORY_SEARCH_MIN_BAKES, 6);
  assert.equal(shouldShowHistorySearch(0), false);
  assert.equal(shouldShowHistorySearch(5), false);
  assert.equal(shouldShowHistorySearch(6), true);
  assert.equal(shouldShowHistorySearch(20), true);
});
