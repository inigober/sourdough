import { Capacitor, registerPlugin } from '@capacitor/core';

import { normalizePermissionState } from './permissionNotice.ts';
import type {
  NativeBakeTimerAlertMode,
  NativeBakeTimerClient,
  NativeBakeTimerPermissionState,
  NativeBakeTimerPermissionStatus,
  NativeBakeTimerRequest,
} from './types.ts';

type BakeTimerPlugin = {
  getPermissionStatus(): Promise<{
    status: NativeBakeTimerPermissionStatus;
    alertMode?: NativeBakeTimerAlertMode;
  }>;
  requestPermission(): Promise<{
    status: NativeBakeTimerPermissionStatus;
    alertMode?: NativeBakeTimerAlertMode;
  }>;
  schedule(options: NativeBakeTimerRequest): Promise<void>;
  cancel(options: { timerId: string }): Promise<void>;
  cancelAll(): Promise<void>;
  openSettings(): Promise<void>;
};

const BakeTimer = registerPlugin<BakeTimerPlugin>('BakeTimer');

function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

function normalizePluginPermission(result: {
  status: NativeBakeTimerPermissionStatus;
  alertMode?: NativeBakeTimerAlertMode;
}): NativeBakeTimerPermissionState {
  return normalizePermissionState(result.status, result.alertMode);
}

export const capacitorNativeBakeTimer: NativeBakeTimerClient = {
  async getPermissionStatus() {
    if (!isNativePlatform()) {
      return normalizePermissionState('unsupported');
    }

    const result = await BakeTimer.getPermissionStatus();
    return normalizePluginPermission(result);
  },

  async requestPermission() {
    if (!isNativePlatform()) {
      return normalizePermissionState('unsupported');
    }

    const result = await BakeTimer.requestPermission();
    return normalizePluginPermission(result);
  },

  async schedule(request: NativeBakeTimerRequest) {
    if (!isNativePlatform()) {
      return;
    }

    await BakeTimer.schedule(request);
  },

  async cancel(timerId: string) {
    if (!isNativePlatform()) {
      return;
    }

    await BakeTimer.cancel({ timerId });
  },

  async cancelAll() {
    if (!isNativePlatform()) {
      return;
    }

    await BakeTimer.cancelAll();
  },

  async openSettings() {
    if (!isNativePlatform()) {
      return;
    }

    await BakeTimer.openSettings();
  },
};
