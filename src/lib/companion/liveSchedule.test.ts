import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { buildTimeline } from '../schedule/buildTimeline.ts';
import { getMixDateTime, formatClockTime } from '../schedule/mixDateTime.ts';
import { createBakeSession, startTimedStep } from './bakeSession.ts';
import { applyScheduleDriftToTimeline, completeTimedStep, getDisplayStepTimes } from './liveSchedule.ts';

test('starting a step late shifts the remaining schedule', () => {
  const schedule = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    includeStarterPrep: false,
    autolyseEnabled: true,
    autolyseMinutes: 30,
    startTime: '09:00',
  };
  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const autolyse = timeline.find((step) => step.id === 'autolyse');

  assert.ok(autolyse);

  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Late autolyse',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });

  const plannedStartMs = getMixDateTime(schedule).getTime();
  const lateStartMs = plannedStartMs + 15 * 60_000;
  const started = startTimedStep(session, autolyse, lateStartMs);

  assert.equal(started.scheduleDriftMinutes, 15);

  const shifted = applyScheduleDriftToTimeline(schedule, timeline, started.scheduleDriftMinutes);
  const shiftedAutolyse = shifted.find((step) => step.id === 'autolyse');
  assert.equal(shiftedAutolyse?.startTime, '09:15');
});

test('completing a step early shifts the remaining schedule earlier', () => {
  const schedule = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    includeStarterPrep: false,
    autolyseEnabled: true,
    autolyseMinutes: 30,
  };
  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const autolyse = timeline.find((step) => step.id === 'autolyse');

  assert.ok(autolyse);

  const startedAt = Date.parse('2026-05-20T09:00:00.000Z');
  const session = {
    ...createBakeSession({
      savedRecipeId: null,
      recipeName: 'Early finish',
      recipeInput: defaultRecipeInput,
      scheduleInput: schedule,
    }),
    currentStepStartedAt: new Date(startedAt).toISOString(),
    activeTimerEndsAt: new Date(startedAt + 30 * 60_000).toISOString(),
  };

  const completed = completeTimedStep(session, autolyse, startedAt + 20 * 60_000);
  assert.equal(completed.scheduleDriftMinutes, -10);
});

test('running step times reflect actual start and timer end', () => {
  const schedule = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    includeStarterPrep: false,
    autolyseEnabled: true,
    autolyseMinutes: 30,
    startTime: '09:00',
  };
  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const autolyse = timeline.find((step) => step.id === 'autolyse');

  assert.ok(autolyse);

  const startedAt = Date.parse('2026-05-20T09:18:00.000Z');
  const startDate = new Date(startedAt);
  const endDate = new Date(startedAt + 30 * 60_000);
  const session = {
    ...createBakeSession({
      savedRecipeId: null,
      recipeName: 'Live times',
      recipeInput: defaultRecipeInput,
      scheduleInput: schedule,
    }),
    scheduleDriftMinutes: 18,
    currentStepStartedAt: new Date(startedAt).toISOString(),
    activeTimerEndsAt: new Date(startedAt + 30 * 60_000).toISOString(),
  };

  const display = getDisplayStepTimes(session, autolyse);
  assert.equal(display.startTime, formatClockTime(startDate));
  assert.equal(display.endTime, formatClockTime(endDate));
});
