import { AUTH_PROMPT_DISMISSED_KEY } from '../auth/authPromptStorage.ts';
import { NATIVE_BAKE_TIMER_PERMISSION_STORAGE_KEY } from '../companion/nativeBakeTimer/constants.ts';
import { BAKE_SESSION_STORAGE_KEY } from '../storage/bakeSessionStorage.ts';
import { BUILDER_DRAFT_STORAGE_KEY } from '../storage/draftStorage.ts';
import { SAVED_RECIPES_STORAGE_KEY } from '../storage/recipeStorage.ts';

/** Prefix for app-owned localStorage keys (does not include Supabase auth tokens). */
export const LOCAL_APP_STATE_KEY_PREFIX = 'sourdough:';

/** Legacy key that predates the colon namespace. */
export const LOCAL_APP_STATE_LEGACY_PREFIX = 'sourdough.';

export const KNOWN_LOCAL_APP_STATE_KEYS = [
  SAVED_RECIPES_STORAGE_KEY,
  BUILDER_DRAFT_STORAGE_KEY,
  BAKE_SESSION_STORAGE_KEY,
  AUTH_PROMPT_DISMISSED_KEY,
  NATIVE_BAKE_TIMER_PERMISSION_STORAGE_KEY,
] as const;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

function isLocalAppStateKey(key: string): boolean {
  return key.startsWith(LOCAL_APP_STATE_KEY_PREFIX) || key.startsWith(LOCAL_APP_STATE_LEGACY_PREFIX);
}

export function listLocalAppStateKeys(storage: StorageLike): string[] {
  const keys: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && isLocalAppStateKey(key)) {
      keys.push(key);
    }
  }

  return keys.sort();
}

/** Removes recipes, drafts, bake sessions, auth UI flags, and other sourdough-owned keys. */
export function resetLocalAppState(storage: StorageLike): string[] {
  const keys = listLocalAppStateKeys(storage);

  for (const key of keys) {
    storage.removeItem(key);
  }

  return keys;
}

export function describeLocalAppStateKey(key: string): string {
  if (key === SAVED_RECIPES_STORAGE_KEY) {
    return 'Saved recipes';
  }

  if (key === BUILDER_DRAFT_STORAGE_KEY) {
    return 'Recipe builder draft';
  }

  if (key === BAKE_SESSION_STORAGE_KEY) {
    return 'Active bake session';
  }

  if (key === AUTH_PROMPT_DISMISSED_KEY) {
    return 'Sign-in prompt dismissed flag';
  }

  if (key === NATIVE_BAKE_TIMER_PERMISSION_STORAGE_KEY) {
    return 'Native timer permission prompt';
  }

  if (key.startsWith('sourdough:local-recipes-imported:')) {
    return 'Cloud recipe import flag';
  }

  return key;
}
