import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { importLocalBakeHistoryIfNeeded } from './importLocalBakeHistory.ts';
import { createLocalBakeHistorySession, listLocalBakeHistorySessions } from './localBakeHistoryStorage.ts';
import type { BakeHistorySessionSummary, CreateBakeHistorySessionInput } from './types.ts';

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

function addLocalBake(storage: MemoryStorage, recipeName: string, completedAt: string, savedRecipeId?: string) {
  return createLocalBakeHistorySession(
    {
      savedRecipeId,
      recipeName,
      recipeInput: defaultRecipeInput,
      scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
      startedAt: '2026-05-01T08:00:00.000Z',
      completedAt,
      steps: [
        {
          stepIndex: 0,
          stepKey: 'mix',
          stepLabel: 'Mix',
          actualStartedAt: '2026-05-01T08:00:00.000Z',
          actualCompletedAt: '2026-05-01T08:30:00.000Z',
        },
      ],
    },
    storage,
  );
}

function remoteSummary(recipeName: string, completedAt: string): BakeHistorySessionSummary {
  return { id: `remote-${recipeName}`, recipeName, completedAt, savedAt: completedAt };
}

test('does nothing and makes no network calls when there are no local bakes', async () => {
  const storage = new MemoryStorage();
  let calls = 0;

  const result = await importLocalBakeHistoryIfNeeded('user-1', {
    storage,
    listRemoteSummaries: async () => {
      calls += 1;
      return [];
    },
    listRemoteRecipeIds: async () => [],
    createRemote: async () => {
      calls += 1;
    },
  });

  assert.equal(result.imported, 0);
  assert.equal(calls, 0);
});

test('uploads local bakes and removes each local copy afterwards', async () => {
  const storage = new MemoryStorage();
  addLocalBake(storage, 'Country loaf', '2026-05-02T10:00:00.000Z');
  addLocalBake(storage, 'Rye', '2026-05-03T10:00:00.000Z');
  const uploaded: CreateBakeHistorySessionInput[] = [];

  const result = await importLocalBakeHistoryIfNeeded('user-1', {
    storage,
    listRemoteSummaries: async () => [],
    listRemoteRecipeIds: async () => [],
    createRemote: async (_userId, input) => {
      uploaded.push(input);
    },
  });

  assert.equal(result.imported, 2);
  assert.deepEqual(uploaded.map((input) => input.recipeName).sort(), ['Country loaf', 'Rye']);
  assert.deepEqual(listLocalBakeHistorySessions(storage), []);
});

test('skips a bake that already exists remotely but still clears the local copy', async () => {
  const storage = new MemoryStorage();
  addLocalBake(storage, 'Country loaf', '2026-05-02T10:00:00.000Z');
  let uploads = 0;

  const result = await importLocalBakeHistoryIfNeeded('user-1', {
    storage,
    // Remote timestamps may come back in a different string format for the same instant.
    listRemoteSummaries: async () => [remoteSummary('Country loaf', '2026-05-02T10:00:00+00:00')],
    listRemoteRecipeIds: async () => [],
    createRemote: async () => {
      uploads += 1;
    },
  });

  assert.equal(result.imported, 0);
  assert.equal(uploads, 0);
  assert.deepEqual(listLocalBakeHistorySessions(storage), []);
});

test('keeps the recipe link only when that recipe exists remotely', async () => {
  const storage = new MemoryStorage();
  addLocalBake(storage, 'Linked', '2026-05-02T10:00:00.000Z', 'recipe-remote');
  addLocalBake(storage, 'Orphan', '2026-05-03T10:00:00.000Z', 'recipe-missing');
  const uploaded = new Map<string, string | undefined>();

  await importLocalBakeHistoryIfNeeded('user-1', {
    storage,
    listRemoteSummaries: async () => [],
    listRemoteRecipeIds: async () => ['recipe-remote'],
    createRemote: async (_userId, input) => {
      uploaded.set(input.recipeName, input.savedRecipeId);
    },
  });

  assert.equal(uploaded.get('Linked'), 'recipe-remote');
  assert.equal(uploaded.get('Orphan'), undefined);
});

test('a failed upload throws and leaves the not-yet-uploaded bakes on this device', async () => {
  const storage = new MemoryStorage();
  addLocalBake(storage, 'First', '2026-05-03T10:00:00.000Z');
  addLocalBake(storage, 'Second', '2026-05-02T10:00:00.000Z');
  let attempts = 0;

  await assert.rejects(
    importLocalBakeHistoryIfNeeded('user-1', {
      storage,
      listRemoteSummaries: async () => [],
      listRemoteRecipeIds: async () => [],
      createRemote: async () => {
        attempts += 1;
        if (attempts === 2) {
          throw new Error('network down');
        }
      },
    }),
    /network down/,
  );

  // Newest first: "First" uploaded and removed, "Second" failed and is kept for the next try.
  assert.deepEqual(
    listLocalBakeHistorySessions(storage).map((session) => session.recipeName),
    ['Second'],
  );
});
