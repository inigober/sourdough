import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldShowTimelineDateLabel } from './timelineDisplay.ts';

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
