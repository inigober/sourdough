export type NativeBakeTimerPermissionStatus = 'unsupported' | 'prompt' | 'granted' | 'denied';

export type NativeBakeTimerAlertMode = 'alarm' | 'notification' | 'none' | 'unsupported';

export type NativeBakeTimerPermissionState = {
  status: NativeBakeTimerPermissionStatus;
  alertMode: NativeBakeTimerAlertMode;
};

export type NativeBakeTimerRequest = {
  timerId: string;
  durationSeconds: number;
  endsAtIso: string;
  title: string;
  recipeName: string;
  bakeSessionId: string;
  deepLinkUrl: string;
};

export type NativeBakeTimerClient = {
  getPermissionStatus(): Promise<NativeBakeTimerPermissionState>;
  requestPermission(): Promise<NativeBakeTimerPermissionState>;
  schedule(request: NativeBakeTimerRequest): Promise<void>;
  cancel(timerId: string): Promise<void>;
  cancelAll(): Promise<void>;
  openSettings(): Promise<void>;
  /** Stops the screen auto-locking (iOS idle timer). No-op on web. */
  setKeepAwake(enabled: boolean): Promise<void>;
};

export type DesiredNativeBakeTimer = NativeBakeTimerRequest;
