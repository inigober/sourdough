import assert from 'node:assert/strict';
import test from 'node:test';

import type { TimelineStep } from '../schedule/types.ts';
import {
  getBakeTimerTestOverrideMinutes,
  getEffectiveStepDurationMinutes,
} from './bakeTimerTestOverride.ts';

const timedStep: TimelineStep = {
  id: 'coil-fold-1',
  label: 'Coil fold 1',
  startOffsetMinutes: 60,
  durationMinutes: 25,
  startTime: '10:00',
  endTime: '10:25',
};

test('getEffectiveStepDurationMinutes returns the step duration without an override env', () => {
  assert.equal(getEffectiveStepDurationMinutes(timedStep), 25);
  assert.equal(getBakeTimerTestOverrideMinutes(timedStep), null);
});
