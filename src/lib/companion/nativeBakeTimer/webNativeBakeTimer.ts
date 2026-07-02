import type {
  NativeBakeTimerClient,
  NativeBakeTimerPermissionState,
  NativeBakeTimerRequest,
} from './types.ts';
import { defaultPermissionState, normalizePermissionState } from './permissionNotice.ts';

const unsupportedState = defaultPermissionState;

export const webNativeBakeTimer: NativeBakeTimerClient = {
  async getPermissionStatus() {
    return unsupportedState;
  },

  async requestPermission() {
    return unsupportedState;
  },

  async schedule() {
    // Web/PWA relies on the in-app countdown only.
  },

  async cancel() {
    // No-op on web.
  },

  async cancelAll() {
    // No-op on web.
  },

  async openSettings() {
    // No-op on web.
  },
};
