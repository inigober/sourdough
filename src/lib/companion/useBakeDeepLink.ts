import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import { APP_ROUTES } from '../../features/recipe-builder/appRoutes.ts';
import { NATIVE_BAKE_DEEP_LINK } from './nativeBakeTimer/constants.ts';

/** Routes native timer “open app” actions back into bake mode. */
export function useBakeDeepLink(onOpenBakeMode: () => void): void {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let cancelled = false;
    let removeListener: (() => void) | undefined;

    void App.addListener('appUrlOpen', (event) => {
      if (cancelled) {
        return;
      }

      if (event.url === NATIVE_BAKE_DEEP_LINK || event.url.endsWith(APP_ROUTES.bake)) {
        onOpenBakeMode();
      }
    }).then((handle) => {
      if (cancelled) {
        void handle.remove();
        return;
      }

      removeListener = () => {
        void handle.remove();
      };
    });

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [onOpenBakeMode]);
}
