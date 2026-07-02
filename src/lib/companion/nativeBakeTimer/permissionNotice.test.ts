import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canScheduleNativeBakeTimer,
  getBakeTimerPermissionNotice,
  normalizePermissionState,
} from './permissionNotice.ts';

test('canScheduleNativeBakeTimer requires granted alarm or notification mode', () => {
  assert.equal(
    canScheduleNativeBakeTimer(normalizePermissionState('granted', 'alarm')),
    true,
  );
  assert.equal(
    canScheduleNativeBakeTimer(normalizePermissionState('granted', 'notification')),
    true,
  );
  assert.equal(
    canScheduleNativeBakeTimer(normalizePermissionState('denied', 'none')),
    false,
  );
});

test('getBakeTimerPermissionNotice explains degraded alerting modes', () => {
  assert.equal(getBakeTimerPermissionNotice(normalizePermissionState('granted', 'alarm')), null);

  const notificationOnly = getBakeTimerPermissionNotice(
    normalizePermissionState('granted', 'notification'),
  );
  assert.ok(notificationOnly);
  assert.match(notificationOnly.title, /notification/i);

  const denied = getBakeTimerPermissionNotice(normalizePermissionState('denied', 'none'));
  assert.ok(denied);
  assert.match(denied.title, /off/i);
});
