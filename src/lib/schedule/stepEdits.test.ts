import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { buildTimeline } from './buildTimeline.ts';
import { createDefaultScheduleInput } from './defaults.ts';
import { canEditStepDuration, setStepDuration, setStepStart } from './stepEdits.ts';
import type { ScheduleInput, TimelineStep } from './types.ts';

// 80% hydration gives slap and folds, three stretch folds and three coil folds on a cold schedule.
const recipe = { ...defaultRecipeInput, hydrationPercent: 80 };
const schedule = createDefaultScheduleInput(recipe);
const timeline = buildTimeline(schedule, recipe);

function stepById(steps: TimelineStep[], id: string): TimelineStep {
  const step = steps.find((candidate) => candidate.id === id);
  assert.ok(step, `step ${id} should exist`);
  return step;
}

function edited(next: ScheduleInput | null): TimelineStep[] {
  assert.ok(next, 'the edit should be accepted');
  return buildTimeline(next, recipe);
}

test('only steps with a real duration the baker controls can be edited', () => {
  for (const id of ['autolyse', 'rest-after-levain', 'rest-after-salt', 'slap-and-fold', 'stretch-fold-2', 'coil-fold-3', 'pre-shape', 'bake-closed']) {
    assert.equal(canEditStepDuration(stepById(timeline, id)), true, id);
  }
  for (const id of ['mix-levain', 'mix-salt', 'shape', 'cold-retard', 'build-levain']) {
    assert.equal(canEditStepDuration(stepById(timeline, id)), false, id);
  }
});

test('a longer autolyse pushes the mix and the bulk later, and the bake time stays put', () => {
  const after = edited(setStepDuration(schedule, recipe, timeline, 'autolyse', 60));
  assert.equal(stepById(after, 'autolyse').durationMinutes, 60);
  assert.equal(stepById(after, 'stretch-fold-1').startOffsetMinutes, stepById(timeline, 'stretch-fold-1').startOffsetMinutes + 15);
  assert.equal(stepById(after, 'pre-shape').startOffsetMinutes, stepById(timeline, 'pre-shape').startOffsetMinutes + 15);
  assert.equal(stepById(after, 'bake-closed').startTime, stepById(timeline, 'bake-closed').startTime);
});

test('a longer fold shifts the later folds and shortens the final rest, with no gap', () => {
  const after = edited(setStepDuration(schedule, recipe, timeline, 'stretch-fold-1', 45));
  assert.equal(stepById(after, 'stretch-fold-1').durationMinutes, 45);
  assert.equal(stepById(after, 'stretch-fold-2').startOffsetMinutes, stepById(timeline, 'stretch-fold-2').startOffsetMinutes + 15);
  assert.equal(stepById(after, 'stretch-fold-2').durationMinutes, 30);
  assert.equal(stepById(after, 'coil-fold-3').durationMinutes, stepById(timeline, 'coil-fold-3').durationMinutes - 15);
  assert.equal(stepById(after, 'pre-shape').startOffsetMinutes, stepById(timeline, 'pre-shape').startOffsetMinutes);
});

test('editing the last fold moves Pre-shape; the end of the bulk stays', () => {
  const lastFold = stepById(timeline, 'coil-fold-3');
  const after = edited(setStepDuration(schedule, recipe, timeline, 'coil-fold-3', 100));
  assert.equal(stepById(after, 'coil-fold-3').durationMinutes, 100);
  assert.equal(stepById(after, 'pre-shape').startOffsetMinutes, lastFold.startOffsetMinutes + 100);
  assert.equal(stepById(after, 'shape').startOffsetMinutes, stepById(timeline, 'shape').startOffsetMinutes);
});

test('a fold edit does not touch the other folds of the same kind', () => {
  const next = setStepDuration(schedule, recipe, timeline, 'coil-fold-1', 40);
  assert.ok(next);
  assert.equal(next.coilFoldRestMinutes, schedule.coilFoldRestMinutes);
  assert.equal(stepById(buildTimeline(next, recipe), 'coil-fold-2').durationMinutes, 30);
});

test('single steps edit the setting they come from', () => {
  assert.equal(setStepDuration(schedule, recipe, timeline, 'rest-after-salt', 50)?.restAfterSaltMinutes, 50);
  assert.equal(setStepDuration(schedule, recipe, timeline, 'bake-closed', 25)?.dutchOvenClosedMinutes, 25);
  assert.equal(setStepDuration(schedule, recipe, timeline, 'bake-out-of-pot', 8)?.dutchOvenOutOfPotMinutes, 8);

  const roomSchedule = { ...schedule, proofingStyle: 'roomTemperature' as const };
  const roomTimeline = buildTimeline(roomSchedule, recipe);
  assert.equal(setStepDuration(roomSchedule, recipe, roomTimeline, 'room-proof', 150)?.roomProofHours, 2.5);
});

test('slap and folds keeps its slapping time and edits the rest after it', () => {
  const slap = stepById(timeline, 'slap-and-fold');
  const next = setStepDuration(schedule, recipe, timeline, 'slap-and-fold', slap.durationMinutes + 10);
  assert.equal(next?.restAfterSlapAndFoldMinutes, schedule.restAfterSlapAndFoldMinutes + 10);
  assert.equal(setStepDuration(schedule, recipe, timeline, 'slap-and-fold', 4), null);
});

test('edits that cannot be honoured are refused instead of guessed', () => {
  assert.equal(setStepDuration(schedule, recipe, timeline, 'cold-retard', 600), null);
  assert.equal(setStepDuration(schedule, recipe, timeline, 'shape', 10), null);
  assert.equal(setStepDuration(schedule, recipe, timeline, 'autolyse', 0), null);
  assert.equal(setStepDuration(schedule, recipe, timeline, 'autolyse', 12.5), null);
  assert.equal(setStepDuration(schedule, recipe, timeline, 'no-such-step', 10), null);
  // The last fold cannot be stretched past the end of the bulk.
  assert.equal(setStepDuration(schedule, recipe, timeline, 'coil-fold-3', 5000), null);
});

test('moving a step start is the same as changing the step before it, so nothing leaves a gap', () => {
  const fold2 = stepById(timeline, 'stretch-fold-2');
  const after = edited(setStepStart(schedule, recipe, timeline, 'stretch-fold-2', fold2.startOffsetMinutes + 10));
  assert.equal(stepById(after, 'stretch-fold-1').durationMinutes, 40);
  assert.equal(stepById(after, 'stretch-fold-2').startOffsetMinutes, fold2.startOffsetMinutes + 10);
});

test('moving the first step moves the whole plan by changing the start time', () => {
  const first = timeline.find((step) => step.id === 'autolyse');
  assert.ok(first);
  const next = setStepStart(schedule, recipe, timeline, 'autolyse', first.startOffsetMinutes - 30);
  assert.equal(next?.startTime, '08:30');
});

test('the start of a step whose predecessor cannot be edited is refused', () => {
  const bake = stepById(timeline, 'bake-closed');
  assert.equal(setStepStart(schedule, recipe, timeline, 'bake-closed', bake.startOffsetMinutes + 10), null);
});

test('old saved schedules without fold overrides still build', () => {
  const legacy: ScheduleInput = { ...schedule };
  delete (legacy as Partial<ScheduleInput>).foldRestMinutesByStep;
  assert.ok(buildTimeline(legacy, recipe).length > 0);
});
