import assert from 'node:assert/strict';
import test from 'node:test';

import { createFlourBlendEntry } from '../recipe/flourBlend.ts';
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
  const lowHydration = { ...defaultRecipeInput, hydrationPercent: 70 };
  const midHydration = { ...defaultRecipeInput, hydrationPercent: 79 };
  const highHydration = { ...defaultRecipeInput, hydrationPercent: 80 };

  assert.deepEqual(getDefaultFoldSets(lowHydration), {
    stretchAndFoldSets: 2,
    coilFoldSets: 0,
    slapAndFolds: 0,
    foldRestMinutes: 30,
  });
  assert.deepEqual(getDefaultFoldSets(midHydration), {
    stretchAndFoldSets: 3,
    coilFoldSets: 0,
    slapAndFolds: 0,
    foldRestMinutes: 30,
  });
  assert.deepEqual(getDefaultFoldSets(highHydration), {
    stretchAndFoldSets: 3,
    coilFoldSets: 3,
    slapAndFolds: 50,
    foldRestMinutes: 30,
  });
  assert.equal(getDefaultSlapAndFolds(highHydration), 50);
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

test('build levain detail stays concise in the schedule timeline', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.startTime = '09:00';
  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const buildLevain = timeline.find((step) => step.id === 'build-levain');

  assert.ok(buildLevain?.detail);
  assert.match(buildLevain.detail ?? '', /ready for mix at 09:45/);
  assert.doesNotMatch(buildLevain.detail ?? '', /autolyse/);
  assert.doesNotMatch(buildLevain.detail ?? '', /starter \+/);
});

test('autolyse shifts levain build earlier so it ends at levain mix-in', () => {
  const withoutAutolyse = createDefaultScheduleInput(defaultRecipeInput);
  withoutAutolyse.starterFromFridge = false;
  withoutAutolyse.levainBuildHours = 10;
  withoutAutolyse.autolyseEnabled = false;
  withoutAutolyse.startTime = '08:00';
  const withAutolyse = createDefaultScheduleInput(defaultRecipeInput);
  withAutolyse.starterFromFridge = false;
  withAutolyse.levainBuildHours = 10;
  withAutolyse.autolyseEnabled = true;
  withAutolyse.autolyseMinutes = 45;
  withAutolyse.startTime = '08:00';

  const noAutolyseTimeline = buildTimeline(withoutAutolyse, defaultRecipeInput);
  const autolyseTimeline = buildTimeline(withAutolyse, defaultRecipeInput);
  const noAutolyseBuild = noAutolyseTimeline.find((step) => step.id === 'build-levain');
  const autolyseBuild = autolyseTimeline.find((step) => step.id === 'build-levain');

  assert.equal(noAutolyseBuild?.startTime, '22:00');
  assert.equal(noAutolyseBuild?.endTime, '08:00');
  assert.equal(autolyseBuild?.startTime, '22:45');
  assert.equal(autolyseBuild?.endTime, '08:45');
  assert.equal(noAutolyseBuild?.durationMinutes, autolyseBuild?.durationMinutes);
  assert.match(noAutolyseBuild?.detail ?? '', /08:00/);
  assert.match(autolyseBuild?.detail ?? '', /08:45/);
});

test('display timeline shows amount and rest minutes on merged mix steps', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = false;
  schedule.restAfterLevainMinutes = 25;
  schedule.restAfterSaltMinutes = 35;
  const timeline = formatTimelineForDisplay(buildTimeline(schedule, defaultRecipeInput));

  const mixLevain = timeline.find((step) => step.label === 'Mix in levain and rest');
  const mixSalt = timeline.find((step) => step.label === 'Mix in salt and rest');

  assert.equal(mixLevain?.detail, '94g levain · 25 min rest');
  assert.equal(mixSalt?.detail, '10g salt · 35 min rest');
});

test('slap and folds are a single timed step including rest', () => {
  const schedule = createDefaultScheduleInput({ ...defaultRecipeInput, hydrationPercent: 85 });
  schedule.includeStarterPrep = false;
  schedule.autolyseEnabled = false;
  schedule.startTime = '09:00';
  schedule.slapAndFolds = 50;
  schedule.restAfterSlapAndFoldMinutes = 30;

  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const slapStep = timeline.find((step) => step.id === 'slap-and-fold');
  const restAfterSlap = timeline.find((step) => step.id === 'rest-after-slap');

  assert.ok(slapStep);
  assert.equal(restAfterSlap, undefined);
  assert.match(slapStep?.detail ?? '', /min rest after/);
});

test('pre-shape and shape mention target rise', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = false;
  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const coilFolds = timeline.filter((step) => step.id.startsWith('coil-fold-'));
  const lastCoilFold = coilFolds.at(-1);
  const preShape = timeline.find((step) => step.id === 'pre-shape');
  const shape = timeline.find((step) => step.id === 'shape');

  assert.doesNotMatch(lastCoilFold?.detail ?? '', /rise since mix/i);
  assert.match(preShape?.detail ?? '', /35–50%/);
  assert.match(shape?.detail ?? '', /35–50%/);
});

test('whole wheat dough gets lower rise guidance in the timeline', () => {
  const wholeWheatRecipe = {
    ...defaultRecipeInput,
    hydrationPercent: 87,
    doughFlours: [createFlourBlendEntry('wholeWheat', 100)],
  };
  const schedule = createDefaultScheduleInput(wholeWheatRecipe);
  schedule.includeStarterPrep = false;
  const timeline = buildTimeline(schedule, wholeWheatRecipe);
  const preShape = timeline.find((step) => step.id === 'pre-shape');

  assert.match(preShape?.detail ?? '', /25–35%/);
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

  assert.equal(shape?.startTime, '17:00');
});

test('cold retard hours are derived from desired bake time on day plus one', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = false;
  schedule.autolyseEnabled = false;
  schedule.startTime = '09:00';
  schedule.desiredBakeTime = '08:00';

  const shapeEndOffset = getShapeEndOffset(schedule, defaultRecipeInput);
  assert.equal(shapeEndOffset, 8 * 60);

  const coldRetardHours = getColdRetardHours(schedule, defaultRecipeInput);
  assert.equal(coldRetardHours, 15);

  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const coldRetard = timeline.find((step) => step.id === 'cold-retard');

  assert.ok(coldRetard);
  assert.equal(coldRetard.startTime, '17:00');
  assert.equal(coldRetard.endTime, '08:00');
  assert.equal(coldRetard.dateLabel, undefined);

  const bakeClosed = timeline.find((step) => step.id === 'bake-closed');
  assert.ok(bakeClosed?.dateLabel);
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

  assert.match(coldRetard?.detail ?? '', /~15h in the fridge/);
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
