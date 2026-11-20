import { getNativeBakeTimerSyncKey } from './deriveDesiredNativeBakeTimer.ts';
import type { DesiredNativeBakeTimer, NativeBakeTimerClient } from './types.ts';

type NativeTimerSyncOptions = {
  client: Pick<NativeBakeTimerClient, 'schedule' | 'cancel' | 'cancelAll'>;
  /** Read at the moment each call runs, so a permission change between two syncs is respected. */
  canSchedule: () => boolean;
};

/**
 * Keeps the native (AlarmKit / notification) timer in step with the timer the bake session wants.
 *
 * Two rules protect against alarms that nothing can cancel any more:
 * - Calls run one at a time, in the order they arrive. A slow "cancel all" can no longer finish after, and
 *   overwrite, the state of a timer that was started right after it, and the same desired timer arriving
 *   twice while the first schedule is still in flight is scheduled once.
 * - A changed end time on the same timer id (restarting a step timer) cancels the old alarm first. The native
 *   side keeps one alarm reference per id, so scheduling again without cancelling would orphan the old alarm.
 */
export function createNativeTimerSync({ client, canSchedule }: NativeTimerSyncOptions) {
  let lastSyncKey: string | null = null;
  let lastTimerId: string | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  async function apply(desired: DesiredNativeBakeTimer | null): Promise<void> {
    if (!desired) {
      // "No native timer wanted" also covers expired in-app timers. cancelAll (not cancel by id) because after a
      // remount we may have lost the id while an alarm is still ringing from a finished step.
      await client.cancelAll();
      lastTimerId = null;
      lastSyncKey = null;
      return;
    }

    const syncKey = getNativeBakeTimerSyncKey(desired);
    if (lastSyncKey === syncKey) {
      return;
    }

    if (lastTimerId) {
      await client.cancel(lastTimerId);
      lastTimerId = null;
      lastSyncKey = null;
    }

    if (canSchedule()) {
      await client.schedule(desired);
      lastSyncKey = syncKey;
      lastTimerId = desired.timerId;
    }
  }

  return {
    sync(desired: DesiredNativeBakeTimer | null): Promise<void> {
      const run = queue.then(() => apply(desired));
      // A failed call must not block the calls queued behind it; the caller still sees the error.
      queue = run.catch(() => undefined);
      return run;
    },
  };
}
