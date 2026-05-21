import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { buildTimeline, formatTimelineForDisplay } from './buildTimeline.ts';
import {
  createDefaultScheduleInput,
  getDefaultFoldSets,
  getDefaultRoomProofHours,
  getDefaultSlapAndFolds,
} from './defaults.ts';
import { getColdRetardAssessment } from './scheduleAdvice.ts';
import { getColdRetardHours, getShapeEndOffset } from './scheduleTiming.ts';
import { addMinutesToTime, formatMinutesAsTime } from './time.ts';

test('default fold sets follow hydration bands', () => {
  assert.deepEqual(getDefaultFoldSets(70), {
    stretchAndFoldSets: 2,
    coilFoldSets: 0,
    slapAndFolds: 0,
    foldRestMinutes: 30,
  });
  assert.deepEqual(getDefaultFoldSets(80), {
    stretchAndFoldSets: 3,
    coilFoldSets: 0,
    slapAndFolds: 0,
    foldRestMinutes: 30,
  });
  assert.equal(getDefaultSlapAndFolds(85), 50);
});

test('room proof hours decrease as temperature rises', () => {
  assert.ok(getDefaultRoomProofHours(18) > getDefaultRoomProofHours(24));
});

test('timeline starts at the chosen start time with autolyse first', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = false;
  schedule.startTime = '09:00';

  const timeline = buildTimeline(schedule, defaultRecipeInput);

  assert.equal(timeline[0]?.label, 'Autolyse');
  assert.equal(timeline[0]?.startTime, '09:00');
});

test('display timeline groups mix and rest pairs', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = false;
  const timeline = formatTimelineForDisplay(buildTimeline(schedule, defaultRecipeInput));

  assert.ok(timeline.some((step) => step.label === 'Mix in levain and rest'));
  assert.ok(timeline.some((step) => step.label === 'Mix in salt and rest'));
});

test('slap and folds start after salt is mixed in', () => {
  const schedule = createDefaultScheduleInput({ ...defaultRecipeInput, hydrationPercent: 85 });
  schedule.includeStarterPrep = false;
  schedule.autolyseEnabled = false;
  schedule.startTime = '09:00';
  schedule.slapAndFolds = 50;
  schedule.restAfterLevainMinutes = 30;
  schedule.restAfterSaltMinutes = 30;

  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const slapStep = timeline.find((step) => step.id === 'slap-and-fold');

  assert.ok(slapStep);
  assert.equal(slapStep.startTime, '10:00');
});

test('fold rows show rest duration before each fold', () => {
  const schedule = createDefaultScheduleInput({ ...defaultRecipeInput, hydrationPercent: 85 });
  schedule.includeStarterPrep = false;
  schedule.slapAndFolds = 50;

  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const firstStretchFold = timeline.find((step) => step.id === 'stretch-fold-1');

  assert.ok(firstStretchFold);
  assert.equal(firstStretchFold.durationMinutes, schedule.stretchAndFoldRestMinutes);
  assert.match(firstStretchFold.detail ?? '', /min rest/);
});

test('bulk window starts when levain is mixed in', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = false;
  schedule.autolyseEnabled = false;
  schedule.startTime = '09:00';

  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const shape = timeline.find((step) => step.id === 'shape');

  assert.equal(shape?.startTime, '15:00');
});

test('cold retard hours are derived from desired bake time on day plus one', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = false;
  schedule.autolyseEnabled = false;
  schedule.startTime = '09:00';
  schedule.desiredBakeTime = '08:00';

  const shapeEndOffset = getShapeEndOffset(schedule, defaultRecipeInput);
  assert.equal(shapeEndOffset, 6 * 60);

  const coldRetardHours = getColdRetardHours(schedule, defaultRecipeInput);
  assert.equal(coldRetardHours, 17);

  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const coldRetard = timeline.find((step) => step.id === 'cold-retard');

  assert.ok(coldRetard);
  assert.equal(coldRetard.startTime, '15:00');
  assert.equal(coldRetard.endTime, '08:00');
});

test('cold retard assessment reflects calculated duration', () => {
  assert.equal(getColdRetardAssessment(14.2), 'Typical overnight range.');
  assert.equal(getColdRetardAssessment(6.1), 'Short for overnight flavor — dough may still feel tight.');
});

test('cold retard detail includes rounded hours in the fridge', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = false;
  schedule.autolyseEnabled = false;
  schedule.startTime = '09:00';
  schedule.desiredBakeTime = '08:00';

  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const coldRetard = timeline.find((step) => step.id === 'cold-retard');

  assert.match(coldRetard?.detail ?? '', /~17h in the fridge/);
});

test('baking steps include minute durations in detail', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = false;
  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const closedBake = timeline.find((step) => step.id === 'bake-closed');

  assert.ok(closedBake);
  assert.equal(closedBake.durationMinutes, schedule.dutchOvenClosedMinutes);
  assert.match(closedBake.detail ?? '', /min/);
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
