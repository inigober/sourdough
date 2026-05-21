import assert from 'node:assert/strict';
import test from 'node:test';

import { getCoachTopicForStepId } from './coachTopics.ts';

test('timeline step ids map to the five coach topics', () => {
  assert.equal(getCoachTopicForStepId('autolyse'), 'autolyse');
  assert.equal(getCoachTopicForStepId('mix-levain'), 'bulk');
  assert.equal(getCoachTopicForStepId('stretch-fold-1'), 'bulk');
  assert.equal(getCoachTopicForStepId('pre-shape'), 'shape');
  assert.equal(getCoachTopicForStepId('shape'), 'shape');
  assert.equal(getCoachTopicForStepId('room-proof'), 'proof');
  assert.equal(getCoachTopicForStepId('cold-retard'), 'proof');
  assert.equal(getCoachTopicForStepId('bake-closed'), 'bake');
});
