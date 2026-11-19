import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AUTH_PROMPT_DISMISSED_KEY,
  isAuthPromptDismissed,
  setAuthPromptDismissed,
  shouldOfferAuthPrompt,
} from './authPromptStorage.ts';

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

test('isAuthPromptDismissed is false until the baker dismisses the prompt', () => {
  const storage = new MemoryStorage();

  assert.equal(isAuthPromptDismissed(storage), false);

  setAuthPromptDismissed(true, storage);

  assert.equal(isAuthPromptDismissed(storage), true);
  assert.equal(storage.getItem(AUTH_PROMPT_DISMISSED_KEY), 'true');
});

test('setAuthPromptDismissed clears the flag when reopened', () => {
  const storage = new MemoryStorage();

  setAuthPromptDismissed(true, storage);
  setAuthPromptDismissed(false, storage);

  assert.equal(isAuthPromptDismissed(storage), false);
  assert.equal(storage.getItem(AUTH_PROMPT_DISMISSED_KEY), null);
});

test('shouldOfferAuthPrompt offers sync to a signed-out baker who has not dismissed it', () => {
  const storage = new MemoryStorage();

  assert.equal(shouldOfferAuthPrompt({ isSignedIn: false, isConfigured: true }, storage), true);
});

test('shouldOfferAuthPrompt stays quiet after a dismissal', () => {
  const storage = new MemoryStorage();
  setAuthPromptDismissed(true, storage);

  assert.equal(shouldOfferAuthPrompt({ isSignedIn: false, isConfigured: true }, storage), false);
});

test('shouldOfferAuthPrompt stays quiet when signed in or when cloud sync is not configured', () => {
  const storage = new MemoryStorage();

  assert.equal(shouldOfferAuthPrompt({ isSignedIn: true, isConfigured: true }, storage), false);
  assert.equal(shouldOfferAuthPrompt({ isSignedIn: false, isConfigured: false }, storage), false);
});
