import { useEffect } from 'react';

import { createScreenWakeLock } from './screenWakeLock.ts';
import { nativeBakeTimer } from './nativeBakeTimer/nativeBakeTimer.ts';

/**
 * Keeps the screen on while the calling component (bake mode) is mounted.
 * Web uses the Screen Wake Lock API; native iOS also turns off the idle timer.
 * Cleanup always re-enables auto-lock, including on unmount.
 */
export function useBakeKeepAwake(): void {
  useEffect(() => {
    const webLock = createScreenWakeLock(navigator, document);
    webLock.start();
    void nativeBakeTimer.setKeepAwake(true).catch(() => undefined);

    return () => {
      webLock.stop();
      void nativeBakeTimer.setKeepAwake(false).catch(() => undefined);
    };
  }, []);
}
