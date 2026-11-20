import assert from 'node:assert/strict';
import test from 'node:test';

import { groupStepsByDayLabel, shouldShowTimelineDateLabel } from './timelineDisplay.ts';

test('timeline date labels render only on the first step for each day', () => {
  const steps = [
    { dateLabel: undefined },
    { dateLabel: 'Sat 24 May' },
    { dateLabel: 'Sat 24 May' },
    { dateLabel: 'Sun 25 May' },
    { dateLabel: 'Sun 25 May' },
  ];

  assert.equal(shouldShowTimelineDateLabel(steps, 0), false);
  assert.equal(shouldShowTimelineDateLabel(steps, 1), true);
  assert.equal(shouldShowTimelineDateLabel(steps, 2), false);
  assert.equal(shouldShowTimelineDateLabel(steps, 3), true);
  assert.equal(shouldShowTimelineDateLabel(steps, 4), false);
});

test('steps are grouped by consecutive day label, and a step with no label gets an unnamed group', () => {
  const steps = [{ id: 'a' }, { id: 'b', dateLabel: 'Bake day −1' }, { id: 'c', dateLabel: 'Bake day −1' }, { id: 'd', dateLabel: 'Bake day' }];
  const groups = groupStepsByDayLabel(steps);

  assert.deepEqual(groups.map((group) => group.label), [undefined, 'Bake day −1', 'Bake day']);
  assert.deepEqual(groups.map((group) => group.steps.map((step) => step.id)), [['a'], ['b', 'c'], ['d']]);
});
