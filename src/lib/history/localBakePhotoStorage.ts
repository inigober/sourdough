/**
 * Loaf photos kept on this device. localStorage is too small for images, so they live in
 * IndexedDB, keyed by the bake's id. A photo stays here until it has been uploaded to the account.
 */
export type BakePhotoStore = {
  get: (bakeId: string) => Promise<Blob | null>;
  put: (bakeId: string, photo: Blob) => Promise<void>;
  remove: (bakeId: string) => Promise<void>;
  keys: () => Promise<string[]>;
};

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
  return {
    get: async (bakeId) => {
      const result = await run<unknown>('readonly', (store) => store.get(bakeId));
      return result instanceof Blob ? result : null;
    },
    put: async (bakeId, photo) => {
      await run('readwrite', (store) => store.put(photo, bakeId));
    },
    remove: async (bakeId) => {
      await run('readwrite', (store) => store.delete(bakeId));
    },
    keys: async () => {
      const keys = await run<IDBValidKey[]>('readonly', (store) => store.getAllKeys());
      return keys.filter((key): key is string => typeof key === 'string');
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

  return {
    get: async (bakeId) => photos.get(bakeId) ?? null,
    put: async (bakeId, photo) => {
      photos.set(bakeId, photo);
    },
    remove: async (bakeId) => {
      photos.delete(bakeId);
    },
    keys: async () => [...photos.keys()],
  };
}
