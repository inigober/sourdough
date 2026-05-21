import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { buildTimeline } from './buildTimeline.ts';
import { createDefaultScheduleInput, getDefaultFoldSets, getDefaultRoomProofHours } from './defaults.ts';
import { addMinutesToTime, formatMinutesAsTime, parseTimeToMinutes } from './time.ts';

test('default fold sets follow hydration bands', () => {
  assert.deepEqual(getDefaultFoldSets(70), {
    stretchAndFoldSets: 2,
    coilFoldSets: 0,
    slapAndFoldSlaps: 0,
    foldRestMinutes: 30,
  });
  assert.deepEqual(getDefaultFoldSets(80), {
    stretchAndFoldSets: 3,
    coilFoldSets: 0,
    slapAndFoldSlaps: 0,
    foldRestMinutes: 30,
  });
});

test('room proof hours decrease as temperature rises', () => {
  assert.ok(getDefaultRoomProofHours(18) > getDefaultRoomProofHours(24));
});

test('timeline starts at the chosen start time with autolyse first', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.startTime = '09:00';

  const timeline = buildTimeline(schedule, defaultRecipeInput);

  assert.equal(timeline[0]?.label, 'Autolyse');
  assert.equal(timeline[0]?.startTime, '09:00');
});

test('slap and fold comes immediately after levain mix', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.slapAndFoldSlaps = 75;

  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const levainIndex = timeline.findIndex((step) => step.id === 'mix-levain');
  const slapIndex = timeline.findIndex((step) => step.id === 'slap-and-fold');
  const saltIndex = timeline.findIndex((step) => step.id === 'mix-salt');

  assert.ok(levainIndex >= 0);
  assert.ok(slapIndex > levainIndex);
  assert.ok(saltIndex > slapIndex);
});

test('timeline moves forward from the start time', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.startTime = '08:30';

  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const lastStep = timeline.at(-1);

  assert.ok(lastStep);
  assert.notEqual(lastStep.startTime, '08:30');
  assert.ok(timeline.length > 4);
});

test('formatMinutesAsTime wraps within a day', () => {
  assert.equal(formatMinutesAsTime(25 * 60), '01:00');
  assert.equal(addMinutesToTime('23:30', 60), '00:30');
});
