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

type AuthOfferContext = {
  isSignedIn: boolean;
  isConfigured: boolean;
};

/**
 * Whether to offer the "Sync your recipes" modal on our own initiative (after a recipe is saved).
 * Only when cloud sync exists, the baker is signed out, and they have not already dismissed it.
 * Explicit sign-in taps (top bar, history) skip this check and always open the modal.
 */
export function shouldOfferAuthPrompt(context: AuthOfferContext, storage?: StorageLike): boolean {
  if (!context.isConfigured || context.isSignedIn) {
    return false;
  }

  return !isAuthPromptDismissed(storage);
}
