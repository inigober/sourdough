import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { buildTimeline } from './buildTimeline.ts';
import { createDefaultScheduleInput } from './defaults.ts';
import {
  applyStepEdit,
  describeTimelineShift,
  formatMinutesReadable,
  getOffsetForClockTime,
  isDisplayStepEditable,
  withFoldOverridesCleared,
} from './stepEditPanel.ts';
import type { TimelineStep } from './types.ts';

const recipe = { ...defaultRecipeInput, hydrationPercent: 80 };
const schedule = createDefaultScheduleInput(recipe);
const timeline = buildTimeline(schedule, recipe);

function stepById(steps: TimelineStep[], id: string): TimelineStep {
  const step = steps.find((candidate) => candidate.id === id);
  assert.ok(step, `step ${id} should exist`);
  return step;
}

test('formatMinutesReadable writes hours and minutes in words', () => {
  assert.equal(formatMinutesReadable(205), '3 h 25 min');
  assert.equal(formatMinutesReadable(45), '45 min');
  assert.equal(formatMinutesReadable(120), '2 h');
  assert.equal(formatMinutesReadable(0), '0 min');
});

test('getOffsetForClockTime picks the nearest equivalent time within 12 hours', () => {
  // A step at 10:15 (offset 75). Typing 10:45 moves it 30 minutes later.
  assert.equal(getOffsetForClockTime(75, '10:15', '10:45'), 105);
  assert.equal(getOffsetForClockTime(75, '10:15', '09:45'), 45);
  // Across midnight: 23:30 -> 00:15 is 45 minutes later, not 23 hours earlier.
  assert.equal(getOffsetForClockTime(900, '23:30', '00:15'), 945);
  assert.equal(getOffsetForClockTime(900, '00:15', '23:30'), 855);
  // Exactly 12 hours apart is treated as later, so the answer is stable.
  assert.equal(getOffsetForClockTime(0, '09:00', '21:00'), 720);
  // The same time is no change; an unreadable time is also no change.
  assert.equal(getOffsetForClockTime(75, '10:15', '10:15'), 75);
  assert.equal(getOffsetForClockTime(75, '10:15', ''), 75);
});

test('describeTimelineShift names what moves and what stays', () => {
  const result = applyStepEdit(schedule, recipe, timeline, 'stretch-fold-1', { durationMinutes: 45 });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.summary, 'Later steps move 15 min later; Pre-shape stays at 17:15.');
});

test('describeTimelineShift says when later steps move earlier', () => {
  const result = applyStepEdit(schedule, recipe, timeline, 'autolyse', { durationMinutes: 30 });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.summary, /^Later steps move 15 min earlier/);
});

test('describeTimelineShift says nothing else moves when nothing does', () => {
  assert.equal(describeTimelineShift(timeline, timeline, 'autolyse'), 'No other steps move.');
});

test('a start time edit moves the step and the step before absorbs the difference', () => {
  const fold2 = stepById(timeline, 'stretch-fold-2');
  const result = applyStepEdit(schedule, recipe, timeline, 'stretch-fold-2', { startTime: '12:05' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const after = buildTimeline(result.schedule, recipe);
  assert.equal(stepById(after, 'stretch-fold-2').startOffsetMinutes, fold2.startOffsetMinutes + 15);
  assert.equal(stepById(after, 'stretch-fold-1').durationMinutes, 45);
});

test('moving the first step changes the start time of the whole plan', () => {
  const result = applyStepEdit(schedule, recipe, timeline, 'autolyse', { startTime: '09:30' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.schedule.startTime, '09:30');
});

test('the merged rest row edits the rest after salt', () => {
  const result = applyStepEdit(schedule, recipe, timeline, 'mix-salt-rest-after-salt', {
    durationMinutes: 45,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.schedule.restAfterSaltMinutes, 45);
});

test('a refused edit reports why and changes nothing', () => {
  const coldRetard = applyStepEdit(schedule, recipe, timeline, 'cold-retard', { durationMinutes: 600 });
  assert.equal(coldRetard.ok, false);
  if (coldRetard.ok) return;
  assert.match(coldRetard.reason, /Change the bake time instead/);

  const notWhole = applyStepEdit(schedule, recipe, timeline, 'autolyse', { durationMinutes: 0 });
  assert.equal(notWhole.ok, false);
  if (notWhole.ok) return;
  assert.match(notWhole.reason, /whole minutes/);

  const unknown = applyStepEdit(schedule, recipe, timeline, 'nope', { durationMinutes: 10 });
  assert.equal(unknown.ok, false);
});

test('a last fold that would run past Shape is refused with a plain reason', () => {
  const result = applyStepEdit(schedule, recipe, timeline, 'coil-fold-3', { durationMinutes: 400 });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.reason, /Shape/);
});

test('changing fold counts or fold rests clears per-fold overrides; other edits keep them', () => {
  assert.deepEqual(withFoldOverridesCleared({ stretchAndFoldSets: 4 }), {
    stretchAndFoldSets: 4,
    foldRestMinutesByStep: undefined,
  });
  assert.deepEqual(withFoldOverridesCleared({ coilFoldRestMinutes: 25 }), {
    coilFoldRestMinutes: 25,
    foldRestMinutesByStep: undefined,
  });
  assert.deepEqual(withFoldOverridesCleared({ slapAndFolds: 0 }), { slapAndFolds: 0 });
  assert.equal('foldRestMinutesByStep' in withFoldOverridesCleared({ autolyseMinutes: 30 }), false);
});

test('rows are tappable only when the baker controls their length; merged rows edit the rest', () => {
  for (const id of ['autolyse', 'mix-levain-rest-after-levain', 'mix-salt-rest-after-salt', 'stretch-fold-2', 'pre-shape', 'bake-closed']) {
    assert.equal(isDisplayStepEditable(timeline, id), true, id);
  }
  for (const id of ['mix-levain', 'mix-salt', 'shape', 'cold-retard', 'build-levain', 'unknown']) {
    assert.equal(isDisplayStepEditable(timeline, id), false, id);
  }
});
