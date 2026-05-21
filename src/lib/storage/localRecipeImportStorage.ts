export function getLocalRecipesImportKey(userId: string): string {
  return `sourdough:local-recipes-imported:${userId}`;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getDefaultStorage(): StorageLike {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available.');
  }

  return localStorage;
}

export function hasLocalRecipesImportCompleted(
  userId: string,
  storage: StorageLike = getDefaultStorage(),
): boolean {
  return storage.getItem(getLocalRecipesImportKey(userId)) === 'true';
}

export function markLocalRecipesImportCompleted(
  userId: string,
  storage: StorageLike = getDefaultStorage(),
): void {
  storage.setItem(getLocalRecipesImportKey(userId), 'true');
}

export function clearLocalRecipesImportCompleted(
  userId: string,
  storage: StorageLike = getDefaultStorage(),
): void {
  storage.removeItem(getLocalRecipesImportKey(userId));
}
