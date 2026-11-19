import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import {
  describePhotoOutcome,
  moveLocalPhotoToAccount,
  retryPendingPhotoUploads,
} from './bakePhotos.ts';
import { importLocalBakeHistoryIfNeeded } from './importLocalBakeHistory.ts';
import { createMemoryBakePhotoStore } from './localBakePhotoStorage.ts';
import { createLocalBakeHistorySession, listLocalBakeHistorySessions } from './localBakeHistoryStorage.ts';

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

const photo = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });

function addLocalBake(storage: MemoryStorage, recipeName: string, completedAt: string) {
  return createLocalBakeHistorySession(
    {
      recipeName,
      recipeInput: defaultRecipeInput,
      scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
      startedAt: '2026-05-01T08:00:00.000Z',
      completedAt,
      steps: [],
    },
    storage,
  );
}

test('describePhotoOutcome only speaks up when the photo needs attention', () => {
  assert.equal(describePhotoOutcome('none', true), null);
  assert.equal(describePhotoOutcome('uploaded', true), null);
  assert.equal(describePhotoOutcome('kept-on-device', false), null);
  assert.match(describePhotoOutcome('kept-on-device', true) ?? '', /try again/);
  assert.match(describePhotoOutcome('lost', false) ?? '', /couldn't be kept/);
});

test('moveLocalPhotoToAccount uploads to the remote id, then removes the local copy', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('local-1', photo);
  const uploads: string[] = [];

  await moveLocalPhotoToAccount({
    userId: 'user-1',
    localBakeId: 'local-1',
    remoteBakeId: 'remote-1',
    remoteHasPhoto: false,
    store,
    uploadRemote: async (_userId, bakeId) => {
      uploads.push(bakeId);
    },
  });

  assert.deepEqual(uploads, ['remote-1']);
  assert.deepEqual(await store.keys(), []);
});

test('moveLocalPhotoToAccount keeps the photo on this device when the upload fails', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('local-1', photo);

  await moveLocalPhotoToAccount({
    userId: 'user-1',
    localBakeId: 'local-1',
    remoteBakeId: 'remote-1',
    remoteHasPhoto: false,
    store,
    uploadRemote: async () => {
      throw new Error('offline');
    },
  });

  // Re-keyed to the account's bake id, so the later retry can find it.
  assert.deepEqual(await store.keys(), ['remote-1']);
});

test('moveLocalPhotoToAccount does not overwrite a photo the account already has', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('local-1', photo);
  let uploads = 0;

  await moveLocalPhotoToAccount({
    userId: 'user-1',
    localBakeId: 'local-1',
    remoteBakeId: 'remote-1',
    remoteHasPhoto: true,
    store,
    uploadRemote: async () => {
      uploads += 1;
    },
  });

  assert.equal(uploads, 0);
  assert.deepEqual(await store.keys(), []);
});

test('retryPendingPhotoUploads uploads waiting photos for account bakes without a photo', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('remote-1', photo);
  await store.put('remote-2', photo);
  await store.put('not-synced-yet', photo);
  const uploads: string[] = [];

  const uploaded = await retryPendingPhotoUploads({
    userId: 'user-1',
    remoteBakes: [{ id: 'remote-1' }, { id: 'remote-2', photoPath: 'user-1/remote-2.jpg' }],
    store,
    uploadRemote: async (_userId, bakeId) => {
      uploads.push(bakeId);
    },
  });

  assert.equal(uploaded, 1);
  assert.deepEqual(uploads, ['remote-1']);
  // remote-2 was already in the account, so its leftover copy is dropped; the unmatched id is untouched.
  assert.deepEqual(await store.keys(), ['not-synced-yet']);
});

test('retryPendingPhotoUploads leaves a photo in place when the upload fails again', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('remote-1', photo);

  const uploaded = await retryPendingPhotoUploads({
    userId: 'user-1',
    remoteBakes: [{ id: 'remote-1' }],
    store,
    uploadRemote: async () => {
      throw new Error('offline');
    },
  });

  assert.equal(uploaded, 0);
  assert.deepEqual(await store.keys(), ['remote-1']);
});

test('import after sign-in uploads the photo under the new bake id and clears the local copy', async () => {
  const storage = new MemoryStorage();
  const local = addLocalBake(storage, 'Country loaf', '2026-05-02T10:00:00.000Z');
  const store = createMemoryBakePhotoStore();
  await store.put(local.id, photo);
  const uploads: string[] = [];

  await importLocalBakeHistoryIfNeeded('user-1', {
    storage,
    listRemoteSummaries: async () => [],
    listRemoteRecipeIds: async () => [],
    createRemote: async () => ({ id: 'remote-1' }),
    photos: {
      store,
      uploadRemote: async (_userId, bakeId) => {
        uploads.push(bakeId);
      },
    },
  });

  assert.deepEqual(uploads, ['remote-1']);
  assert.deepEqual(await store.keys(), []);
  assert.deepEqual(listLocalBakeHistorySessions(storage), []);
});

test('import after sign-in still imports the bake when the photo upload fails', async () => {
  const storage = new MemoryStorage();
  const local = addLocalBake(storage, 'Country loaf', '2026-05-02T10:00:00.000Z');
  const store = createMemoryBakePhotoStore();
  await store.put(local.id, photo);

  const result = await importLocalBakeHistoryIfNeeded('user-1', {
    storage,
    listRemoteSummaries: async () => [],
    listRemoteRecipeIds: async () => [],
    createRemote: async () => ({ id: 'remote-1' }),
    photos: {
      store,
      uploadRemote: async () => {
        throw new Error('offline');
      },
    },
  });

  assert.equal(result.imported, 1);
  assert.deepEqual(listLocalBakeHistorySessions(storage), []);
  assert.deepEqual(await store.keys(), ['remote-1']);
});
