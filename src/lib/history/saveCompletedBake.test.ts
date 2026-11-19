import assert from 'node:assert/strict';
import test from 'node:test';

import { createBakeSession } from '../companion/bakeSession.ts';
import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { clearBakeSession, loadBakeSession, saveBakeSession } from '../storage/bakeSessionStorage.ts';
import { listLocalBakeHistorySessions } from './localBakeHistoryStorage.ts';
import { createMemoryBakePhotoStore } from './localBakePhotoStorage.ts';
import { saveCompletedBake } from './saveCompletedBake.ts';
import type { BakeHistorySession, CreateBakeHistorySessionInput } from './types.ts';

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

function buildSession() {
  return createBakeSession({
    savedRecipeId: 'recipe-1',
    recipeName: 'Country loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
  });
}

const remoteNever = async (): Promise<BakeHistorySession> => {
  throw new Error('remote should not be called');
};

test('signed out: the bake is saved on this device with its recipe link and notes', async () => {
  const storage = new MemoryStorage();

  const { destination } = await saveCompletedBake({
    session: buildSession(),
    input: { note: 'Great crumb', assessment: 'great' },
    userId: null,
    completedAt: '2026-05-02T10:00:00.000Z',
    storage,
    createRemote: remoteNever,
  });

  assert.equal(destination, 'local');
  const [saved] = listLocalBakeHistorySessions(storage);
  assert.ok(saved);
  assert.equal(saved.recipeName, 'Country loaf');
  assert.equal(saved.savedRecipeId, 'recipe-1');
  assert.equal(saved.overallNote, 'Great crumb');
  assert.equal(saved.overallAssessment, 'great');
  assert.equal(saved.completedAt, '2026-05-02T10:00:00.000Z');
});

test('signed in: the bake goes to the remote store and not to this device', async () => {
  const storage = new MemoryStorage();
  const received: Array<{ userId: string; input: CreateBakeHistorySessionInput }> = [];

  const { destination } = await saveCompletedBake({
    session: buildSession(),
    input: { note: '', assessment: 'ok' },
    userId: 'user-1',
    storage,
    createRemote: async (userId, input) => {
      received.push({ userId, input });
      return {} as BakeHistorySession;
    },
  });

  assert.equal(destination, 'remote');
  assert.equal(received[0]?.userId, 'user-1');
  assert.equal(received[0]?.input.recipeName, 'Country loaf');
  assert.equal(received[0]?.input.overallAssessment, 'ok');
  assert.deepEqual(listLocalBakeHistorySessions(storage), []);
});

test('a failed remote save throws and leaves the stored bake session untouched', async () => {
  const storage = new MemoryStorage();
  const session = buildSession();
  saveBakeSession(session, storage);

  await assert.rejects(
    saveCompletedBake({
      session,
      input: { note: '' },
      userId: 'user-1',
      storage,
      createRemote: async () => {
        throw new Error('network down');
      },
    }),
    /network down/,
  );

  assert.equal(loadBakeSession(storage)?.id, session.id);
  assert.deepEqual(listLocalBakeHistorySessions(storage), []);
});

test('a failed local save (storage full) throws and keeps the bake session', async () => {
  const sessionStorage = new MemoryStorage();
  const session = buildSession();
  saveBakeSession(session, sessionStorage);

  const fullHistoryStorage = new MemoryStorage();
  fullHistoryStorage.setItem = () => {
    throw new Error('QuotaExceededError');
  };

  await assert.rejects(
    saveCompletedBake({
      session,
      input: { note: '' },
      userId: null,
      storage: fullHistoryStorage,
      createRemote: remoteNever,
    }),
    /QuotaExceededError/,
  );

  assert.equal(loadBakeSession(sessionStorage)?.id, session.id);
});

test('saving does not clear the bake session itself; only the caller does, after success', async () => {
  const storage = new MemoryStorage();
  const session = buildSession();
  saveBakeSession(session, storage);

  await saveCompletedBake({
    session,
    input: { note: '' },
    userId: null,
    storage,
    createRemote: remoteNever,
  });

  // History and the session share this test storage; the session is still there until cleared.
  assert.equal(loadBakeSession(storage)?.id, session.id);
  clearBakeSession(storage);
  assert.equal(loadBakeSession(storage), null);
  assert.equal(listLocalBakeHistorySessions(storage).length, 1);
});

const photo = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });

test('no photo chosen: the photo store is never touched', async () => {
  const photoStore = createMemoryBakePhotoStore();

  const result = await saveCompletedBake({
    session: buildSession(),
    input: { note: '' },
    userId: null,
    storage: new MemoryStorage(),
    photoStore,
    createRemote: remoteNever,
  });

  assert.equal(result.photo, 'none');
  assert.deepEqual(await photoStore.keys(), []);
});

test('signed out: the photo is kept on this device under the local bake id', async () => {
  const storage = new MemoryStorage();
  const photoStore = createMemoryBakePhotoStore();

  const result = await saveCompletedBake({
    session: buildSession(),
    input: { note: '' },
    userId: null,
    storage,
    photo,
    photoStore,
    createRemote: remoteNever,
  });

  const [saved] = listLocalBakeHistorySessions(storage);
  assert.equal(result.photo, 'kept-on-device');
  assert.deepEqual(await photoStore.keys(), [saved?.id]);
});

test('signed in: the photo is uploaded to the remote bake id and not kept on this device', async () => {
  const photoStore = createMemoryBakePhotoStore();
  const uploads: Array<{ userId: string; bakeId: string }> = [];

  const result = await saveCompletedBake({
    session: buildSession(),
    input: { note: '' },
    userId: 'user-1',
    storage: new MemoryStorage(),
    photo,
    photoStore,
    createRemote: async () => ({ id: 'remote-bake' }) as BakeHistorySession,
    uploadRemotePhoto: async (userId, bakeId) => {
      uploads.push({ userId, bakeId });
    },
  });

  assert.equal(result.photo, 'uploaded');
  assert.deepEqual(uploads, [{ userId: 'user-1', bakeId: 'remote-bake' }]);
  assert.deepEqual(await photoStore.keys(), []);
});

test('signed in: a failed photo upload still saves the bake and keeps the photo for a retry', async () => {
  const photoStore = createMemoryBakePhotoStore();

  const result = await saveCompletedBake({
    session: buildSession(),
    input: { note: '' },
    userId: 'user-1',
    storage: new MemoryStorage(),
    photo,
    photoStore,
    createRemote: async () => ({ id: 'remote-bake' }) as BakeHistorySession,
    uploadRemotePhoto: async () => {
      throw new Error('storage down');
    },
  });

  assert.equal(result.destination, 'remote');
  assert.equal(result.photo, 'kept-on-device');
  assert.deepEqual(await photoStore.keys(), ['remote-bake']);
});

test('a photo that cannot be stored anywhere is reported as lost, not thrown', async () => {
  const photoStore = createMemoryBakePhotoStore();
  photoStore.put = async () => {
    throw new Error('IndexedDB unavailable');
  };

  const result = await saveCompletedBake({
    session: buildSession(),
    input: { note: '' },
    userId: null,
    storage: new MemoryStorage(),
    photo,
    photoStore,
    createRemote: remoteNever,
  });

  assert.equal(result.destination, 'local');
  assert.equal(result.photo, 'lost');
});
