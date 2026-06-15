import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { buildTimeline } from '../schedule/buildTimeline.ts';
import { getMixDateTime, formatClockTime } from '../schedule/mixDateTime.ts';
import { createBakeSession, startTimedStep } from './bakeSession.ts';
import { applyScheduleDriftToTimeline, canStartTimedStep, completeTimedStep, getDisplayStepTimes, isTimedStepRunning, recordSkippedStep } from './liveSchedule.ts';

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

test('recordSkippedStep logs a jump-over step at the provided time', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Skipped step',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const step = {
    id: 'skipped-step',
    label: 'Skipped',
    startTime: '10:00',
    endTime: '10:30',
    startOffsetMinutes: 60,
    durationMinutes: 30,
  };
  const skipTime = Date.parse('2026-05-20T10:15:00.000Z');

  const skipped = recordSkippedStep(session, step, 2, skipTime);

  assert.equal(skipped.stepLogs.length, 1);
  assert.equal(skipped.stepLogs[0]?.stepIndex, 2);
  assert.equal(skipped.stepLogs[0]?.actualStartedAt, '2026-05-20T10:15:00.000Z');
  assert.equal(skipped.stepLogs[0]?.actualCompletedAt, '2026-05-20T10:15:00.000Z');
});

test('canStartTimedStep blocks while a timer is already running', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Timer state',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const timedStep = {
    id: 'timed',
    label: 'Timed',
    startTime: '10:00',
    endTime: '10:30',
    startOffsetMinutes: 0,
    durationMinutes: 30,
  };
  const untimedStep = { ...timedStep, id: 'untimed', durationMinutes: 0 };

  assert.equal(canStartTimedStep(session, timedStep), true);
  assert.equal(canStartTimedStep(session, untimedStep), false);

  const running = {
    ...session,
    currentStepStartedAt: '2026-05-20T10:00:00.000Z',
    activeTimerEndsAt: '2026-05-20T10:30:00.000Z',
  };

  assert.equal(isTimedStepRunning(running), true);
  assert.equal(canStartTimedStep(running, timedStep), false);
});

test('getDisplayStepTimes falls back to planned times when no timer is running', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Planned times',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const step = {
    id: 'planned',
    label: 'Planned',
    startTime: '09:30',
    endTime: '10:00',
    startOffsetMinutes: 30,
    durationMinutes: 30,
    dateLabel: 'Wed 21 May',
  };

  assert.deepEqual(getDisplayStepTimes(session, step), {
    startTime: '09:30',
    endTime: '10:00',
    dateLabel: 'Wed 21 May',
  });
});
