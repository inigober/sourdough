import { useCallback, useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import type { BakeSession } from '../types.ts';
import type { TimelineStep } from '../../schedule/types.ts';
import { getTimerRemainingSeconds } from '../bakeTimer.ts';
import { NATIVE_BAKE_TIMER_PERMISSION_STORAGE_KEY } from './constants.ts';
import {
  deriveDesiredNativeBakeTimer,
  getNativeBakeTimerSyncKey,
} from './deriveDesiredNativeBakeTimer.ts';
import { nativeBakeTimer } from './nativeBakeTimer.ts';
import {
  canScheduleNativeBakeTimer,
  defaultPermissionState,
  getBakeTimerPermissionNotice,
} from './permissionNotice.ts';
import type { NativeBakeTimerPermissionState } from './types.ts';

export type BakeTimerPermissionNotice = {
  title: string;
  body: string;
  showOpenSettings: boolean;
};

export type UseBakeNativeTimerResult = {
  permissionState: NativeBakeTimerPermissionState;
  permissionNotice: BakeTimerPermissionNotice | null;
  ensurePermissionForStartTimer: () => Promise<NativeBakeTimerPermissionState>;
  openTimerSettings: () => Promise<void>;
};

function readPermissionAsked(): boolean {
  try {
    return window.localStorage.getItem(NATIVE_BAKE_TIMER_PERMISSION_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markPermissionAsked(): void {
  try {
    window.localStorage.setItem(NATIVE_BAKE_TIMER_PERMISSION_STORAGE_KEY, '1');
  } catch {
    // Ignore storage failures; permission can still be requested.
  }
}

function buildPermissionNotice(
  state: NativeBakeTimerPermissionState,
): BakeTimerPermissionNotice | null {
  const copy = getBakeTimerPermissionNotice(state);
  if (!copy) {
    return null;
  }

  return {
    ...copy,
    showOpenSettings: state.status === 'denied' || state.alertMode === 'none' || state.alertMode === 'notification',
  };
}

export function useBakeNativeTimer(
  session: BakeSession,
  currentStep: TimelineStep | null,
): UseBakeNativeTimerResult {
  const [permissionState, setPermissionState] =
    useState<NativeBakeTimerPermissionState>(defaultPermissionState);
  const lastSyncKeyRef = useRef<string | null>(null);
  const lastTimerIdRef = useRef<string | null>(null);

  const refreshPermissionState = useCallback(async () => {
    const nextState = await nativeBakeTimer.getPermissionStatus();
    setPermissionState(nextState);
    return nextState;
  }, []);

  const syncNativeTimer = useCallback(
    async (desired: ReturnType<typeof deriveDesiredNativeBakeTimer>) => {
      if (!desired) {
        // Desired state is "no native timer" — including expired in-app timers.
        // cancelAll covers cold start / remount where lastTimerIdRef was lost but
        // AlarmKit is still alerting from a finished step.
        await nativeBakeTimer.cancelAll();
        lastTimerIdRef.current = null;
        lastSyncKeyRef.current = null;
        return;
      }

      const syncKey = getNativeBakeTimerSyncKey(desired);
      if (lastSyncKeyRef.current === syncKey) {
        return;
      }

      if (lastTimerIdRef.current && lastTimerIdRef.current !== desired.timerId) {
        await nativeBakeTimer.cancel(lastTimerIdRef.current);
      }

      if (canScheduleNativeBakeTimer(permissionState)) {
        await nativeBakeTimer.schedule(desired);
        lastSyncKeyRef.current = syncKey;
        lastTimerIdRef.current = desired.timerId;
      }
    },
    [permissionState],
  );

  useEffect(() => {
    void refreshPermissionState();
  }, [refreshPermissionState]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let removeListener: (() => void) | undefined;

    void App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void refreshPermissionState();
        // Re-sync on foreground: dismiss a ringing alarm if the step already ended
        // while the app was locked (e.g. unlocked via app switcher, not Open app).
        const desired = deriveDesiredNativeBakeTimer(session, currentStep);
        void syncNativeTimer(desired);
      }
    }).then((handle) => {
      removeListener = () => {
        void handle.remove();
      };
    });

    return () => {
      removeListener?.();
    };
  }, [currentStep, refreshPermissionState, session, syncNativeTimer]);

  useEffect(() => {
    const desired = deriveDesiredNativeBakeTimer(session, currentStep);
    void syncNativeTimer(desired);
  }, [session, currentStep, syncNativeTimer]);

  // When the in-app end time passes, session.activeTimerEndsAt is unchanged, so the
  // sync effect above does not re-run. Explicitly clear native alarms at expiry so
  // AlarmKit stops ringing once bake mode shows "Time's up" (or on resume after).
  useEffect(() => {
    if (!session.activeTimerEndsAt) {
      return;
    }

    const endsAtMs = new Date(session.activeTimerEndsAt).getTime();
    if (Number.isNaN(endsAtMs)) {
      return;
    }

    const dismissIfExpired = (): void => {
      if (getTimerRemainingSeconds(session.activeTimerEndsAt) === 0) {
        void syncNativeTimer(null);
      }
    };

    const remainingMs = endsAtMs - Date.now();
    if (remainingMs <= 0) {
      dismissIfExpired();
      return;
    }

    const timeout = window.setTimeout(dismissIfExpired, remainingMs + 100);
    return () => window.clearTimeout(timeout);
  }, [session.activeTimerEndsAt, syncNativeTimer]);

  useEffect(() => {
    return () => {
      void nativeBakeTimer.cancelAll();
      lastSyncKeyRef.current = null;
      lastTimerIdRef.current = null;
    };
  }, []);

  const ensurePermissionForStartTimer = useCallback(async () => {
    const currentState = await refreshPermissionState();

    if (currentState.status === 'unsupported') {
      return currentState;
    }

    if (canScheduleNativeBakeTimer(currentState)) {
      return currentState;
    }

    if (!readPermissionAsked() || currentState.status === 'prompt') {
      markPermissionAsked();
      const requestedState = await nativeBakeTimer.requestPermission();
      setPermissionState(requestedState);
      return requestedState;
    }

    return currentState;
  }, [refreshPermissionState]);

  const openTimerSettings = useCallback(async () => {
    await nativeBakeTimer.openSettings();
  }, []);

  return {
    permissionState,
    permissionNotice: buildPermissionNotice(permissionState),
    ensurePermissionForStartTimer,
    openTimerSettings,
  };
}
