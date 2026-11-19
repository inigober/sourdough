import assert from 'node:assert/strict';
import test from 'node:test';

import { createScreenWakeLock, type WakeLockDocumentLike } from './screenWakeLock.ts';

function createFakeDocument(): WakeLockDocumentLike & { setVisibility(state: string): void } {
  let visibilityState = 'visible';
  const listeners = new Set<() => void>();

  return {
    get visibilityState() {
      return visibilityState;
    },
    addEventListener: (_type, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener);
    },
    setVisibility(state: string) {
      visibilityState = state;
      listeners.forEach((listener) => listener());
    },
  };
}

function createFakeNavigator() {
  const sentinels: { released: boolean; release(): Promise<void> }[] = [];
  return {
    sentinels,
    wakeLock: {
      async request() {
        const sentinel = {
          released: false,
          async release() {
            sentinel.released = true;
          },
        };
        sentinels.push(sentinel);
        return sentinel;
      },
    },
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test('wake lock is a no-op when the API is unsupported', () => {
  const lock = createScreenWakeLock({}, createFakeDocument());
  assert.equal(lock.isSupported, false);
  lock.start();
  lock.stop();
});

test('wake lock is acquired on start and released on stop', async () => {
  const nav = createFakeNavigator();
  const lock = createScreenWakeLock(nav, createFakeDocument());

  lock.start();
  await flush();
  assert.equal(nav.sentinels.length, 1);
  assert.equal(nav.sentinels[0]?.released, false);

  lock.stop();
  await flush();
  assert.equal(nav.sentinels[0]?.released, true);
});

test('wake lock is requested again when the page becomes visible', async () => {
  const nav = createFakeNavigator();
  const doc = createFakeDocument();
  const lock = createScreenWakeLock(nav, doc);

  lock.start();
  await flush();
  doc.setVisibility('hidden');
  await flush();
  assert.equal(nav.sentinels.length, 1);

  doc.setVisibility('visible');
  await flush();
  assert.equal(nav.sentinels.length, 2);
});

test('stop during a pending request releases the lock that arrives later', async () => {
  const nav = createFakeNavigator();
  const lock = createScreenWakeLock(nav, createFakeDocument());

  lock.start();
  lock.stop();
  await flush();

  assert.equal(nav.sentinels.length, 1);
  assert.equal(nav.sentinels[0]?.released, true);
});

test('stopped wake lock ignores later visibility changes', async () => {
  const nav = createFakeNavigator();
  const doc = createFakeDocument();
  const lock = createScreenWakeLock(nav, doc);

  lock.start();
  await flush();
  lock.stop();
  doc.setVisibility('hidden');
  doc.setVisibility('visible');
  await flush();

  assert.equal(nav.sentinels.length, 1);
});
