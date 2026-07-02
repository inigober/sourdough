import type {
  NativeBakeTimerAlertMode,
  NativeBakeTimerPermissionState,
  NativeBakeTimerPermissionStatus,
} from './types.ts';

const defaultPermissionState: NativeBakeTimerPermissionState = {
  status: 'unsupported',
  alertMode: 'unsupported',
};

export function canScheduleNativeBakeTimer(state: NativeBakeTimerPermissionState): boolean {
  return state.status === 'granted' && state.alertMode !== 'none' && state.alertMode !== 'unsupported';
}

export function getBakeTimerPermissionNotice(
  state: NativeBakeTimerPermissionState,
): { title: string; body: string } | null {
  if (state.status === 'unsupported') {
    return null;
  }

  if (state.status === 'granted' && state.alertMode === 'alarm') {
    return null;
  }

  if (state.status === 'granted' && state.alertMode === 'notification') {
    return {
      title: 'Notification alerts only',
      body: 'This device will send a notification when the step ends. For lock-screen countdown timers and alarm-style alerts, allow alarms for Sourdough in Settings.',
    };
  }

  if (state.status === 'denied' || state.alertMode === 'none') {
    return {
      title: 'Timer alerts are off',
      body: 'The in-app countdown still runs, but you will not get a lock-screen alert when this step ends.',
    };
  }

  return null;
}

export function normalizePermissionState(
  status: NativeBakeTimerPermissionStatus,
  alertMode?: NativeBakeTimerAlertMode,
): NativeBakeTimerPermissionState {
  return {
    status,
    alertMode: alertMode ?? (status === 'unsupported' ? 'unsupported' : 'none'),
  };
}

export { defaultPermissionState };
