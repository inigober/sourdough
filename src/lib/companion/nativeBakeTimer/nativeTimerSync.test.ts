import assert from 'node:assert/strict';
import test from 'node:test';

import { createNativeTimerSync } from './nativeTimerSync.ts';
import type { DesiredNativeBakeTimer } from './types.ts';

function desiredTimer(timerId: string, endsAtIso: string): DesiredNativeBakeTimer {
  return {
    timerId,
    durationSeconds: 600,
    endsAtIso,
    title: timerId,
    recipeName: 'Country loaf',
    bakeSessionId: 'session-1',
    deepLinkUrl: 'sourdough://bake',
  };
}

/** A fake native side that records the calls in order, and can be slowed down to expose races. */
function createFakeClient(delaysMs: { cancelAll?: number; schedule?: number } = {}) {
  const calls: string[] = [];
  const active = new Set<string>();
  const wait = (ms = 0) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  return {
    calls,
    active,
    client: {
      async schedule(request: DesiredNativeBakeTimer) {
        calls.push(`schedule ${request.timerId}@${request.endsAtIso}`);
        await wait(delaysMs.schedule);
        // Like the native side: every schedule makes a NEW alarm; only cancelling the same id removes it.
        active.add(`${request.timerId}@${request.endsAtIso}`);
      },
      async cancel(timerId: string) {
        calls.push(`cancel ${timerId}`);
        for (const key of [...active]) {
          if (key.startsWith(`${timerId}@`)) {
            active.delete(key);
          }
        }
      },
      async cancelAll() {
        calls.push('cancelAll');
        await wait(delaysMs.cancelAll);
        active.clear();
      },
    },
  };
}

test('jumping off a running step cancels its native timer, and starting the next step schedules only the new one', async () => {
  const fake = createFakeClient();
  const sync = createNativeTimerSync({ client: fake.client, canSchedule: () => true });

  await sync.sync(desiredTimer('s:autolyse', '2026-01-01T10:00:00Z'));
  assert.deepEqual([...fake.active], ['s:autolyse@2026-01-01T10:00:00Z']);

  await sync.sync(null); // jumped to the next step: no timer wanted
  assert.deepEqual([...fake.active], []);

  await sync.sync(desiredTimer('s:mix', '2026-01-01T10:30:00Z'));
  assert.deepEqual([...fake.active], ['s:mix@2026-01-01T10:30:00Z']);
});

test('restarting a step timer (same id, new end time) cancels the old alarm first', async () => {
  const fake = createFakeClient();
  const sync = createNativeTimerSync({ client: fake.client, canSchedule: () => true });

  await sync.sync(desiredTimer('s:autolyse', '2026-01-01T10:00:00Z'));
  await sync.sync(desiredTimer('s:autolyse', '2026-01-01T10:45:00Z'));

  assert.deepEqual([...fake.active], ['s:autolyse@2026-01-01T10:45:00Z']);
  assert.deepEqual(fake.calls, [
    'schedule s:autolyse@2026-01-01T10:00:00Z',
    'cancel s:autolyse',
    'schedule s:autolyse@2026-01-01T10:45:00Z',
  ]);
});

test('a slow cancel-all and a quick start of the next step cannot overlap or lose track of the new timer', async () => {
  const fake = createFakeClient({ cancelAll: 20 });
  const sync = createNativeTimerSync({ client: fake.client, canSchedule: () => true });

  await sync.sync(desiredTimer('s:autolyse', '2026-01-01T10:00:00Z'));

  // Not awaited one by one: the baker jumps and taps Start before the first call has finished.
  const jump = sync.sync(null);
  const start = sync.sync(desiredTimer('s:mix', '2026-01-01T10:30:00Z'));
  // The same state arriving again (an unrelated re-render) must not schedule a second alarm.
  const again = sync.sync(desiredTimer('s:mix', '2026-01-01T10:30:00Z'));
  await Promise.all([jump, start, again]);

  assert.deepEqual([...fake.active], ['s:mix@2026-01-01T10:30:00Z']);
  assert.equal(fake.calls.filter((call) => call.startsWith('schedule s:mix')).length, 1);

  // And the new timer is still tracked: ending the step cancels it.
  await sync.sync(null);
  assert.deepEqual([...fake.active], []);
});

test('the same desired timer arriving twice while the first schedule is still in flight schedules once', async () => {
  const fake = createFakeClient({ schedule: 20 });
  const sync = createNativeTimerSync({ client: fake.client, canSchedule: () => true });
  const timer = desiredTimer('s:autolyse', '2026-01-01T10:00:00Z');

  await Promise.all([sync.sync(timer), sync.sync(timer)]);

  assert.equal(fake.calls.filter((call) => call.startsWith('schedule')).length, 1);
});

test('without permission nothing is scheduled, but a previous timer is still cancelled', async () => {
  const fake = createFakeClient();
  let allowed = true;
  const sync = createNativeTimerSync({ client: fake.client, canSchedule: () => allowed });

  await sync.sync(desiredTimer('s:autolyse', '2026-01-01T10:00:00Z'));
  allowed = false;
  await sync.sync(desiredTimer('s:mix', '2026-01-01T10:30:00Z'));

  assert.deepEqual([...fake.active], []);
});

test('a failed native call does not block later syncs', async () => {
  const fake = createFakeClient();
  let failNext = true;
  const client = {
    ...fake.client,
    async schedule(request: DesiredNativeBakeTimer) {
      if (failNext) {
        failNext = false;
        throw new Error('native failure');
      }
      return fake.client.schedule(request);
    },
  };
  const sync = createNativeTimerSync({ client, canSchedule: () => true });

  await assert.rejects(sync.sync(desiredTimer('s:autolyse', '2026-01-01T10:00:00Z')), /native failure/);
  await sync.sync(desiredTimer('s:autolyse', '2026-01-01T10:00:00Z'));

  assert.deepEqual([...fake.active], ['s:autolyse@2026-01-01T10:00:00Z']);
});
