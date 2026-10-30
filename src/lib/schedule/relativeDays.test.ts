import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { buildTimeline, formatTimelineForDisplay } from './buildTimeline.ts';
import { createDefaultScheduleInput } from './defaults.ts';
import {
  formatBakeDayLabel,
  formatMixAndBakeSentence,
  formatMixDaySummary,
  getMixDayBakeOffset,
  groupStepsByBakeDay,
  withBakeDayLabels,
  withoutCalendarDate,
} from './relativeDays.ts';

function buildColdTimeline() {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = true;
  schedule.starterFromFridge = false;
  schedule.proofingStyle = 'cold';
  schedule.startTime = '09:00';
  schedule.desiredBakeTime = '08:00';

  return formatTimelineForDisplay(buildTimeline(schedule, defaultRecipeInput));
}

test('formatBakeDayLabel counts back from bake day', () => {
  assert.equal(formatBakeDayLabel(0), 'Bake day');
  assert.equal(formatBakeDayLabel(-1), 'Bake day −1');
  assert.equal(formatBakeDayLabel(-2), 'Bake day −2');
  assert.equal(formatBakeDayLabel(1), 'Bake day +1');
});

test('mix day offset and summary describe a cold proof as mixing the day before', () => {
  const steps = buildColdTimeline();

  assert.equal(getMixDayBakeOffset(steps), -1);
  assert.equal(formatMixDaySummary(steps), 'Mix on bake day −1');
  assert.equal(formatMixAndBakeSentence(-1), 'Mix on bake day −1 and bake on bake day.');
});

test('same-day schedules are described as mixing and baking together', () => {
  assert.equal(formatMixAndBakeSentence(0), 'Mix and bake on the same day.');
  assert.equal(formatMixDaySummary([]), 'Mix and bake on the same day');
});

test('groupStepsByBakeDay keeps step order and starts a group when the day changes', () => {
  const groups = groupStepsByBakeDay(buildColdTimeline());

  assert.deepEqual(
    groups.map((group) => group.label),
    ['Bake day −2', 'Bake day −1', 'Bake day'],
  );
  assert.equal(groups[0].steps[0].id, 'build-levain');
  assert.equal(groups[2].steps[0].id, 'bake-closed');
});

test('withBakeDayLabels replaces calendar labels with relative ones', () => {
  const labelled = withBakeDayLabels(buildColdTimeline());

  assert.ok(labelled.every((step) => /^Bake day/.test(step.dateLabel ?? '')));
});

test('withoutCalendarDate clears the mix date and keeps everything else', () => {
  const schedule = { ...createDefaultScheduleInput(defaultRecipeInput), mixDate: '2026-05-20' };
  const cleared = withoutCalendarDate(schedule);

  assert.equal(cleared.mixDate, '');
  assert.equal(cleared.startTime, schedule.startTime);
  assert.equal(schedule.mixDate, '2026-05-20');
});
