import { Capacitor } from '@capacitor/core';

import { capacitorNativeBakeTimer } from './capacitorNativeBakeTimer.ts';
import { webNativeBakeTimer } from './webNativeBakeTimer.ts';
import type { NativeBakeTimerClient } from './types.ts';

export const nativeBakeTimer: NativeBakeTimerClient = Capacitor.isNativePlatform()
  ? capacitorNativeBakeTimer
  : webNativeBakeTimer;
