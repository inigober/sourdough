/**
 * Loaf photos kept on this device. localStorage is too small for images, so they live in
 * IndexedDB, keyed by the bake's id. A photo stays here until it has been uploaded to the account.
 * Each photo can have a small thumbnail next to it (stored under `<bake id>:thumb` in the same
 * object store, so the database needs no upgrade). Callers never see that key: `put` and `remove`
 * handle both, and `keys` lists bake ids only.
 */
export type BakePhotoStore = {
  get: (bakeId: string) => Promise<Blob | null>;
  /** The small list thumbnail, or null when the bake has none (older photos). */
  getThumbnail: (bakeId: string) => Promise<Blob | null>;
  /** Saves the photo and its thumbnail. Without a thumbnail, any older thumbnail is dropped. */
  put: (bakeId: string, photo: Blob, thumbnail?: Blob | null) => Promise<void>;
  /** Removes the photo and its thumbnail. */
  remove: (bakeId: string) => Promise<void>;
  keys: () => Promise<string[]>;
};

const THUMBNAIL_KEY_SUFFIX = ':thumb';

function thumbnailKey(bakeId: string): string {
  return `${bakeId}${THUMBNAIL_KEY_SUFFIX}`;
}

const DATABASE_NAME = 'sourdough-bake-photos';
const OBJECT_STORE_NAME = 'photos';

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Photo storage is not available on this device.'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(OBJECT_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open photo storage.'));
  });

  // Let the next call try again if opening failed (for example in a private window).
  databasePromise.catch(() => {
    databasePromise = undefined;
  });

  return databasePromise;
}

/** Runs one transaction. `action` may issue several requests; the returned one supplies the result. */
async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(OBJECT_STORE_NAME, mode);
    const request = action(transaction.objectStore(OBJECT_STORE_NAME));
    // Resolve on transaction completion so a put/delete is durable before we report success.
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error ?? new Error('Photo storage failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Photo storage failed.'));
  });
}

export function createIndexedDbBakePhotoStore(): BakePhotoStore {
  async function readBlob(key: string): Promise<Blob | null> {
    const result = await run<unknown>('readonly', (store) => store.get(key));
    return result instanceof Blob ? result : null;
  }

  return {
    get: (bakeId) => readBlob(bakeId),
    getThumbnail: (bakeId) => readBlob(thumbnailKey(bakeId)),
    put: async (bakeId, photo, thumbnail) => {
      // One transaction, so a photo is never stored next to another photo's thumbnail.
      await run('readwrite', (store) => {
        if (thumbnail) {
          store.put(thumbnail, thumbnailKey(bakeId));
        } else {
          store.delete(thumbnailKey(bakeId));
        }
        return store.put(photo, bakeId);
      });
    },
    remove: async (bakeId) => {
      await run('readwrite', (store) => {
        store.delete(thumbnailKey(bakeId));
        return store.delete(bakeId);
      });
    },
    keys: async () => {
      const keys = await run<IDBValidKey[]>('readonly', (store) => store.getAllKeys());
      return keys.filter(
        (key): key is string => typeof key === 'string' && !key.endsWith(THUMBNAIL_KEY_SUFFIX),
      );
    },
  };
}

let defaultStore: BakePhotoStore | undefined;

/** The shared on-device photo store. Created on first use so tests and Node never touch IndexedDB. */
export function getDefaultBakePhotoStore(): BakePhotoStore {
  defaultStore ??= createIndexedDbBakePhotoStore();
  return defaultStore;
}

/** In-memory store with the same interface, for tests. */
export function createMemoryBakePhotoStore(): BakePhotoStore {
  const photos = new Map<string, Blob>();
  const thumbnails = new Map<string, Blob>();

  return {
    get: async (bakeId) => photos.get(bakeId) ?? null,
    getThumbnail: async (bakeId) => thumbnails.get(bakeId) ?? null,
    put: async (bakeId, photo, thumbnail) => {
      photos.set(bakeId, photo);
      if (thumbnail) {
        thumbnails.set(bakeId, thumbnail);
      } else {
        thumbnails.delete(bakeId);
      }
    },
    remove: async (bakeId) => {
      photos.delete(bakeId);
      thumbnails.delete(bakeId);
    },
    keys: async () => [...photos.keys()],
  };
}
