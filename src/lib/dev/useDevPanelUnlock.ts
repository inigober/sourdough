import { useCallback, useRef } from 'react';

export const DEV_PANEL_UNLOCK_TAP_COUNT = 5;
export const DEV_PANEL_UNLOCK_WINDOW_MS = 2500;

type UnlockTapEvent = {
  preventDefault?: () => void;
  stopPropagation?: () => void;
};

export function useDevPanelUnlock(onUnlock: () => void): {
  registerUnlockTap: (event?: UnlockTapEvent) => boolean;
} {
  const tapCountRef = useRef(0);
  const windowStartedAtRef = useRef(0);

  const registerUnlockTap = useCallback(
    (event?: UnlockTapEvent): boolean => {
      const now = Date.now();

      if (now - windowStartedAtRef.current > DEV_PANEL_UNLOCK_WINDOW_MS) {
        tapCountRef.current = 0;
        windowStartedAtRef.current = now;
      }

      tapCountRef.current += 1;

      if (tapCountRef.current < DEV_PANEL_UNLOCK_TAP_COUNT) {
        return false;
      }

      tapCountRef.current = 0;
      windowStartedAtRef.current = 0;
      event?.preventDefault?.();
      event?.stopPropagation?.();
      onUnlock();
      return true;
    },
    [onUnlock],
  );

  return { registerUnlockTap };
}
