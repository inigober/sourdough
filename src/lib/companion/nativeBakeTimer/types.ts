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
};

export type DesiredNativeBakeTimer = NativeBakeTimerRequest;
