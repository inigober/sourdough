import assert from 'node:assert/strict';
import test from 'node:test';

import { formatScheduleAsText } from './exportSchedule.ts';
import type { TimelineStep } from './types.ts';

test('formatScheduleAsText renders readable schedule lines', () => {
  const steps: TimelineStep[] = [
    {
      id: 'autolyse',
      label: 'Autolyse',
      startTime: '09:00',
      endTime: '09:45',
      durationMinutes: 45,
      startOffsetMinutes: 0,
      detail: 'Flour and water only',
    },
    {
      id: 'shape',
      label: 'Shape',
      startTime: '15:00',
      endTime: '15:00',
      durationMinutes: 0,
      startOffsetMinutes: 360,
    },
  ];

  const text = formatScheduleAsText({
    recipeName: 'dark wheat moderate hydration',
    mixDateLabel: 'Thu 22 May',
    bakeDateLabel: 'Fri 23 May',
    steps,
  });

  assert.match(text, /dark wheat moderate hydration/);
  assert.match(text, /09:00–09:45  Autolyse/);
  assert.match(text, /15:00  Shape/);
});
