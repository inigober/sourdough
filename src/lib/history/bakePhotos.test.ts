import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import {
  describePhotoOutcome,
  describePhotoRemoval,
  moveLocalPhotoToAccount,
  removePhotoFromBake,
  retryPendingPhotoUploads,
  savePhotoForBake,
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
const thumbnail = new Blob(['tiny'], { type: 'image/jpeg' });
const makeThumbnail = async () => thumbnail;

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

test('describePhotoOutcome words the messages for an existing bake without saying the bake was saved', () => {
  assert.match(describePhotoOutcome('kept-on-device', true, 'existing-bake') ?? '', /try again/);
  assert.doesNotMatch(describePhotoOutcome('kept-on-device', true, 'existing-bake') ?? '', /bake is saved/);
  assert.match(describePhotoOutcome('unchanged', true, 'existing-bake') ?? '', /previous photo is unchanged/);
  assert.match(describePhotoOutcome('lost', false, 'existing-bake') ?? '', /couldn't be kept/);
  assert.equal(describePhotoRemoval('removed'), null);
  assert.match(describePhotoRemoval('failed') ?? '', /couldn't be removed/);
});

test('signed in: the photo and its thumbnail are uploaded together', async () => {
  const store = createMemoryBakePhotoStore();
  const uploads: Array<{ photo: Blob; thumbnail: Blob | null }> = [];

  const outcome = await savePhotoForBake({
    photo,
    bakeId: 'bake-1',
    userId: 'user-1',
    store,
    uploadRemote: async (_userId, _bakeId, uploadedPhoto, uploadedThumbnail) => {
      uploads.push({ photo: uploadedPhoto, thumbnail: uploadedThumbnail });
    },
    makeThumbnail,
  });

  assert.equal(outcome, 'uploaded');
  assert.deepEqual(uploads, [{ photo, thumbnail }]);
  assert.deepEqual(await store.keys(), []);
});

test('a thumbnail that cannot be made does not stop the photo being saved', async () => {
  const store = createMemoryBakePhotoStore();
  const uploads: Array<Blob | null> = [];

  const outcome = await savePhotoForBake({
    photo,
    bakeId: 'bake-1',
    userId: 'user-1',
    store,
    uploadRemote: async (_userId, _bakeId, _photo, uploadedThumbnail) => {
      uploads.push(uploadedThumbnail);
    },
    makeThumbnail: async () => {
      throw new Error('no canvas');
    },
  });

  assert.equal(outcome, 'uploaded');
  assert.deepEqual(uploads, [null]);
});

test('signed out: photo and thumbnail are kept on this device', async () => {
  const store = createMemoryBakePhotoStore();

  const outcome = await savePhotoForBake({
    photo,
    bakeId: 'bake-1',
    userId: null,
    store,
    uploadRemote: async () => {
      throw new Error('should not upload');
    },
    makeThumbnail,
  });

  assert.equal(outcome, 'kept-on-device');
  assert.equal(await store.get('bake-1'), photo);
  assert.equal(await store.getThumbnail('bake-1'), thumbnail);
});

test('adding a photo to a bake without one keeps it for a retry when the upload fails', async () => {
  const store = createMemoryBakePhotoStore();

  const outcome = await savePhotoForBake({
    photo,
    bakeId: 'bake-1',
    userId: 'user-1',
    hadRemotePhoto: false,
    store,
    uploadRemote: async () => {
      throw new Error('offline');
    },
    makeThumbnail,
  });

  assert.equal(outcome, 'kept-on-device');
  assert.deepEqual(await store.keys(), ['bake-1']);
  assert.equal(await store.getThumbnail('bake-1'), thumbnail);
});

test('replacing a photo: a failed upload leaves the old photo alone and keeps nothing pending', async () => {
  const store = createMemoryBakePhotoStore();

  const outcome = await savePhotoForBake({
    photo,
    bakeId: 'bake-1',
    userId: 'user-1',
    hadRemotePhoto: true,
    store,
    uploadRemote: async () => {
      throw new Error('offline');
    },
    makeThumbnail,
  });

  assert.equal(outcome, 'unchanged');
  assert.deepEqual(await store.keys(), []);
});

test('a successful upload drops an older copy still waiting on this device', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('bake-1', new Blob(['old']), thumbnail);

  const outcome = await savePhotoForBake({
    photo,
    bakeId: 'bake-1',
    userId: 'user-1',
    store,
    uploadRemote: async () => undefined,
    makeThumbnail,
  });

  assert.equal(outcome, 'uploaded');
  assert.deepEqual(await store.keys(), []);
});

test('replacing a photo on this device overwrites the old photo and thumbnail', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('bake-1', new Blob(['old']), new Blob(['old-thumb']));

  await savePhotoForBake({
    photo,
    bakeId: 'bake-1',
    userId: null,
    store,
    uploadRemote: async () => undefined,
    makeThumbnail: async () => null,
  });

  assert.equal(await store.get('bake-1'), photo);
  assert.equal(await store.getThumbnail('bake-1'), null);
});

test('removing a photo signed out clears the photo and thumbnail on this device', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('bake-1', photo, thumbnail);

  const result = await removePhotoFromBake({
    bakeId: 'bake-1',
    userId: null,
    store,
    removeRemote: async () => {
      throw new Error('should not be called');
    },
  });

  assert.equal(result, 'removed');
  assert.equal(await store.get('bake-1'), null);
  assert.equal(await store.getThumbnail('bake-1'), null);
});

test('removing a photo signed in removes it from the account and any waiting copy', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('bake-1', photo, thumbnail);
  const removed: string[] = [];

  const result = await removePhotoFromBake({
    bakeId: 'bake-1',
    userId: 'user-1',
    store,
    removeRemote: async (userId, bakeId) => {
      removed.push(`${userId}/${bakeId}`);
    },
  });

  assert.equal(result, 'removed');
  assert.deepEqual(removed, ['user-1/bake-1']);
  assert.deepEqual(await store.keys(), []);
});

test('a failed removal in the account reports failure and touches nothing else', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('bake-1', photo, thumbnail);

  const result = await removePhotoFromBake({
    bakeId: 'bake-1',
    userId: 'user-1',
    store,
    removeRemote: async () => {
      throw new Error('offline');
    },
  });

  assert.equal(result, 'failed');
  assert.deepEqual(await store.keys(), ['bake-1']);
});

test('moving a local photo uploads its stored thumbnail too', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('local-1', photo, thumbnail);
  const uploads: Array<Blob | null> = [];

  await moveLocalPhotoToAccount({
    userId: 'user-1',
    localBakeId: 'local-1',
    remoteBakeId: 'remote-1',
    remoteHasPhoto: false,
    store,
    uploadRemote: async (_userId, _bakeId, _photo, uploadedThumbnail) => {
      uploads.push(uploadedThumbnail);
    },
  });

  assert.deepEqual(uploads, [thumbnail]);
});

test('moving an older local photo without a thumbnail makes one on the way', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('local-1', photo);
  const uploads: Array<Blob | null> = [];

  await moveLocalPhotoToAccount({
    userId: 'user-1',
    localBakeId: 'local-1',
    remoteBakeId: 'remote-1',
    remoteHasPhoto: false,
    store,
    uploadRemote: async (_userId, _bakeId, _photo, uploadedThumbnail) => {
      uploads.push(uploadedThumbnail);
    },
    makeThumbnail,
  });

  assert.deepEqual(uploads, [thumbnail]);
});

test('a failed move keeps the thumbnail with the photo under the account bake id', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('local-1', photo, thumbnail);

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

  assert.equal(await store.getThumbnail('remote-1'), thumbnail);
  assert.equal(await store.get('local-1'), null);
});

test('retrying a waiting upload sends the stored thumbnail too', async () => {
  const store = createMemoryBakePhotoStore();
  await store.put('remote-1', photo, thumbnail);
  const uploads: Array<Blob | null> = [];

  await retryPendingPhotoUploads({
    userId: 'user-1',
    remoteBakes: [{ id: 'remote-1' }],
    store,
    uploadRemote: async (_userId, _bakeId, _photo, uploadedThumbnail) => {
      uploads.push(uploadedThumbnail);
    },
  });

  assert.deepEqual(uploads, [thumbnail]);
  assert.deepEqual(await store.keys(), []);
});

test('import after sign-in passes the thumbnail along with the photo', async () => {
  const storage = new MemoryStorage();
  const local = addLocalBake(storage, 'Country loaf', '2026-05-02T10:00:00.000Z');
  const store = createMemoryBakePhotoStore();
  await store.put(local.id, photo, thumbnail);
  const uploads: Array<Blob | null> = [];

  await importLocalBakeHistoryIfNeeded('user-1', {
    storage,
    listRemoteSummaries: async () => [],
    listRemoteRecipeIds: async () => [],
    createRemote: async () => ({ id: 'remote-1' }),
    photos: {
      store,
      uploadRemote: async (_userId, _bakeId, _photo, uploadedThumbnail) => {
        uploads.push(uploadedThumbnail);
      },
    },
  });

  assert.deepEqual(uploads, [thumbnail]);
});
