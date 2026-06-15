import assert from 'node:assert/strict';
import test from 'node:test';

import { getLoafAssessmentLabel } from './assessment.ts';

test('getLoafAssessmentLabel maps known assessments', () => {
  assert.equal(getLoafAssessmentLabel('great'), 'Great loaf');
  assert.equal(getLoafAssessmentLabel('ok'), 'OK');
  assert.equal(getLoafAssessmentLabel('needsWork'), 'Needs work');
});

test('getLoafAssessmentLabel returns null when unset', () => {
  assert.equal(getLoafAssessmentLabel(undefined), null);
});
