/**
 * Keeps the screen on while bake mode is open, using the web Screen Wake Lock API.
 * The browser drops the lock whenever the page is hidden, so we ask again when the
 * page becomes visible. Everything is a no-op where the API does not exist.
 *
 * Native iOS uses a separate path (BakeTimer.setKeepAwake) because WKWebView support
 * for this API is not something we can rely on.
 */

export type WakeLockSentinelLike = {
  release(): Promise<void>;
};

export type WakeLockNavigatorLike = {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinelLike>;
  };
};

export type WakeLockDocumentLike = {
  visibilityState: string;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
};

export type ScreenWakeLock = {
  isSupported: boolean;
  /** Start holding the lock (idempotent). */
  start(): void;
  /** Release the lock and stop re-acquiring it (idempotent). */
  stop(): void;
};

export function createScreenWakeLock(
  nav: WakeLockNavigatorLike,
  doc: WakeLockDocumentLike,
): ScreenWakeLock {
  const wakeLockApi = nav.wakeLock;
  let wanted = false;
  let sentinel: WakeLockSentinelLike | null = null;
  let requestInFlight = false;

  async function acquire(): Promise<void> {
    if (!wakeLockApi || !wanted || sentinel || requestInFlight || doc.visibilityState !== 'visible') {
      return;
    }

    requestInFlight = true;
    try {
      const granted = await wakeLockApi.request('screen');
      if (!wanted) {
        // stop() was called while the request was pending.
        await granted.release().catch(() => undefined);
        return;
      }
      sentinel = granted;
    } catch {
      // Denied (for example low power mode); bake mode works without it.
    } finally {
      requestInFlight = false;
    }
  }

  function handleVisibilityChange(): void {
    if (doc.visibilityState === 'visible') {
      // The browser already released the old sentinel when the page was hidden.
      sentinel = null;
      void acquire();
    }
  }

  return {
    isSupported: Boolean(wakeLockApi),
    start() {
      if (wanted) {
        return;
      }
      wanted = true;
      doc.addEventListener('visibilitychange', handleVisibilityChange);
      void acquire();
    },
    stop() {
      if (!wanted) {
        return;
      }
      wanted = false;
      doc.removeEventListener('visibilitychange', handleVisibilityChange);
      const held = sentinel;
      sentinel = null;
      void held?.release().catch(() => undefined);
    },
  };
}
