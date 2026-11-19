import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import {
  LOCAL_BAKE_HISTORY_STORAGE_KEY,
  createLocalBakeHistorySession,
  deleteLocalBakeHistorySession,
  getLocalBakeHistorySession,
  listLocalBakeHistorySessions,
  listLocalBakeHistorySummaries,
  updateLocalBakeHistorySession,
} from './localBakeHistoryStorage.ts';
import type { CreateBakeHistorySessionInput } from './types.ts';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

function buildInput(overrides: Partial<CreateBakeHistorySessionInput> = {}): CreateBakeHistorySessionInput {
  return {
    savedRecipeId: 'recipe-1',
    recipeName: '  Country loaf  ',
    recipeInput: defaultRecipeInput,
    scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
    overallNote: '  Good oven spring  ',
    overallAssessment: 'great',
    startedAt: '2026-05-01T08:00:00.000Z',
    completedAt: '2026-05-02T10:00:00.000Z',
    steps: [
      {
        stepIndex: 1,
        stepKey: 'bake',
        stepLabel: 'Bake',
        actualStartedAt: '2026-05-02T09:00:00.000Z',
        actualCompletedAt: '2026-05-02T10:00:00.000Z',
      },
      {
        stepIndex: 0,
        stepKey: 'mix',
        stepLabel: 'Mix',
        actualStartedAt: '2026-05-01T08:00:00.000Z',
        actualCompletedAt: '2026-05-01T08:30:00.000Z',
      },
    ],
    ...overrides,
  };
}

test('createLocalBakeHistorySession stores the same shape as a remote history row', () => {
  const storage = new MemoryStorage();
  const created = createLocalBakeHistorySession(buildInput(), storage, new Date('2026-05-02T10:05:00.000Z'));

  assert.equal(created.recipeName, 'Country loaf');
  assert.equal(created.overallNote, 'Good oven spring');
  assert.equal(created.savedRecipeId, 'recipe-1');
  assert.equal(created.savedAt, '2026-05-02T10:05:00.000Z');
  assert.equal(created.steps.length, 2);
  assert.ok(created.steps.every((step) => typeof step.id === 'string' && step.id.length > 0));

  const loaded = getLocalBakeHistorySession(created.id, storage);
  assert.ok(loaded);
  assert.equal(loaded.id, created.id);
  assert.equal(loaded.recipeName, 'Country loaf');
  assert.deepEqual(
    loaded.steps.map((step) => step.stepIndex),
    [0, 1],
  );
});

test('listLocalBakeHistorySessions returns newest completed bake first', () => {
  const storage = new MemoryStorage();
  createLocalBakeHistorySession(buildInput({ recipeName: 'Older', completedAt: '2026-04-01T10:00:00.000Z' }), storage);
  createLocalBakeHistorySession(buildInput({ recipeName: 'Newer', completedAt: '2026-05-01T10:00:00.000Z' }), storage);

  assert.deepEqual(
    listLocalBakeHistorySummaries(storage).map((entry) => entry.recipeName),
    ['Newer', 'Older'],
  );
});

test('summaries truncate long notes and carry the assessment', () => {
  const storage = new MemoryStorage();
  createLocalBakeHistorySession(buildInput({ overallNote: 'x'.repeat(300) }), storage);

  const [summary] = listLocalBakeHistorySummaries(storage);
  assert.ok(summary);
  assert.equal(summary.overallAssessment, 'great');
  assert.equal(summary.overallNotePreview?.length, 120);
});

test('updateLocalBakeHistorySession edits note and assessment and can clear them', () => {
  const storage = new MemoryStorage();
  const created = createLocalBakeHistorySession(buildInput(), storage);

  const edited = updateLocalBakeHistorySession(
    created.id,
    { overallNote: 'Slightly dense', overallAssessment: 'ok' },
    storage,
  );
  assert.equal(edited.overallNote, 'Slightly dense');
  assert.equal(edited.overallAssessment, 'ok');

  const cleared = updateLocalBakeHistorySession(created.id, { overallNote: '  ', overallAssessment: null }, storage);
  assert.equal(cleared.overallNote, undefined);
  assert.equal(cleared.overallAssessment, undefined);
  assert.equal(getLocalBakeHistorySession(created.id, storage)?.overallNote, undefined);
});

test('updateLocalBakeHistorySession throws for an unknown bake', () => {
  assert.throws(() => updateLocalBakeHistorySession('missing', { overallNote: 'x' }, new MemoryStorage()));
});

test('deleteLocalBakeHistorySession removes one bake and clears the key when empty', () => {
  const storage = new MemoryStorage();
  const first = createLocalBakeHistorySession(buildInput(), storage);
  const second = createLocalBakeHistorySession(buildInput({ recipeName: 'Second' }), storage);

  assert.equal(deleteLocalBakeHistorySession('missing', storage), false);
  assert.equal(deleteLocalBakeHistorySession(first.id, storage), true);
  assert.deepEqual(
    listLocalBakeHistorySessions(storage).map((session) => session.id),
    [second.id],
  );

  deleteLocalBakeHistorySession(second.id, storage);
  assert.equal(storage.getItem(LOCAL_BAKE_HISTORY_STORAGE_KEY), null);
});

test('listLocalBakeHistorySessions ignores corrupt payloads and unusable rows', () => {
  const storage = new MemoryStorage();
  storage.setItem(LOCAL_BAKE_HISTORY_STORAGE_KEY, '{not json');
  assert.deepEqual(listLocalBakeHistorySessions(storage), []);

  storage.setItem(LOCAL_BAKE_HISTORY_STORAGE_KEY, JSON.stringify({ not: 'an array' }));
  assert.deepEqual(listLocalBakeHistorySessions(storage), []);

  storage.setItem(LOCAL_BAKE_HISTORY_STORAGE_KEY, JSON.stringify([null, 'x', { id: 'only-id' }]));
  assert.deepEqual(listLocalBakeHistorySessions(storage), []);
});

test('listLocalBakeHistorySessions fills in fields missing from older saved shapes', () => {
  const storage = new MemoryStorage();
  storage.setItem(
    LOCAL_BAKE_HISTORY_STORAGE_KEY,
    JSON.stringify([
      {
        id: 'old-1',
        recipeName: 'Old bake',
        recipeInput: defaultRecipeInput,
        // An older schedule shape without the newer starter-prep fields.
        scheduleInput: { mixDate: '', startTime: '08:00' },
        startedAt: '2026-01-01T08:00:00.000Z',
        completedAt: '2026-01-02T08:00:00.000Z',
      },
    ]),
  );

  const [session] = listLocalBakeHistorySessions(storage);
  assert.ok(session);
  assert.equal(session.savedRecipeId, null);
  assert.equal(session.savedAt, '2026-01-02T08:00:00.000Z');
  assert.equal(session.updatedAt, '2026-01-02T08:00:00.000Z');
  assert.deepEqual(session.steps, []);
  assert.equal(typeof session.scheduleInput.includeStarterPrep, 'boolean');
});

test('createLocalBakeHistorySession surfaces storage failures instead of swallowing them', () => {
  const storage = new MemoryStorage();
  storage.setItem = () => {
    throw new Error('QuotaExceededError');
  };

  assert.throws(() => createLocalBakeHistorySession(buildInput(), storage), /QuotaExceededError/);
});
