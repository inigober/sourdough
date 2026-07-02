import { getTimerRemainingSeconds } from '../bakeTimer.ts';
import { isTimedStepRunning } from '../liveSchedule.ts';
import type { BakeSession } from '../types.ts';
import type { TimelineStep } from '../../schedule/types.ts';
import { NATIVE_BAKE_DEEP_LINK } from './constants.ts';
import { createBakeTimerId } from './createBakeTimerId.ts';
import type { DesiredNativeBakeTimer } from './types.ts';

export function deriveDesiredNativeBakeTimer(
  session: BakeSession,
  currentStep: TimelineStep | null,
  now = Date.now(),
): DesiredNativeBakeTimer | null {
  if (!currentStep || currentStep.durationMinutes <= 0) {
    return null;
  }

  if (!isTimedStepRunning(session) || !session.activeTimerEndsAt) {
    return null;
  }

  const remainingSeconds = getTimerRemainingSeconds(session.activeTimerEndsAt, now);
  if (remainingSeconds === null) {
    return null;
  }

  return {
    timerId: createBakeTimerId(session, currentStep),
    durationSeconds: Math.max(1, remainingSeconds),
    endsAtIso: session.activeTimerEndsAt,
    title: currentStep.label,
    recipeName: session.recipeName,
    bakeSessionId: session.id,
    deepLinkUrl: NATIVE_BAKE_DEEP_LINK,
  };
}

export function getNativeBakeTimerSyncKey(timer: DesiredNativeBakeTimer): string {
  return `${timer.timerId}:${timer.endsAtIso}`;
}
