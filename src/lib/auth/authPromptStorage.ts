export const AUTH_PROMPT_DISMISSED_KEY = 'sourdough:auth-prompt-dismissed';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) {
    return storage;
  }

  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage;
}

export function isAuthPromptDismissed(storage?: StorageLike): boolean {
  const resolved = resolveStorage(storage);
  if (!resolved) {
    return false;
  }

  return resolved.getItem(AUTH_PROMPT_DISMISSED_KEY) === 'true';
}

export function setAuthPromptDismissed(dismissed: boolean, storage?: StorageLike): void {
  const resolved = resolveStorage(storage);
  if (!resolved) {
    return;
  }

  if (dismissed) {
    resolved.setItem(AUTH_PROMPT_DISMISSED_KEY, 'true');
    return;
  }

  resolved.removeItem(AUTH_PROMPT_DISMISSED_KEY);
}
