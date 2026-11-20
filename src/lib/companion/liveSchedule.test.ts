import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { buildTimeline } from '../schedule/buildTimeline.ts';
import { getMixDateTime, formatClockTime } from '../schedule/mixDateTime.ts';
import { createBakeSession, startTimedStep } from './bakeSession.ts';
import {
  applyScheduleDriftToTimeline,
  canStartTimedStep,
  completeTimedStep,
  formatDurationMinutes,
  getDisplayStepTimes,
  getEarlyStartMinutes,
  getStepPlannedStartMs,
  getMinutesUntilStep,
  isTimedStepRunning,
  recordSkippedStep,
  shouldConfirmEarlyStart,
  stepEndsOnLaterDay,
} from './liveSchedule.ts';

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

function createStarterPrepFixture() {
  const schedule = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    includeStarterPrep: true,
    startTime: '05:45',
  };
  const timeline = buildTimeline(schedule, defaultRecipeInput);
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Early start',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const first = timeline[0];
  const second = timeline[1];
  assert.ok(first && second);
  assert.ok(first.durationMinutes > 0);

  return { schedule, timeline, session, first, second };
}

test('starting a step far too early shifts the rest of the plan with it', () => {
  // Review bug (problem 8): only the running step was re-based, so later steps kept
  // their old clock times and the Full schedule looked out of order.
  const { schedule, timeline, session, first, second } = createStarterPrepFixture();
  const plannedStartMs = getStepPlannedStartMs(schedule, first, 0);
  const startedMs = plannedStartMs - (14 * 60 + 43) * 60_000;

  const started = startTimedStep(session, first, startedMs);
  assert.equal(started.scheduleDriftMinutes, -(14 * 60 + 43));

  const shifted = applyScheduleDriftToTimeline(schedule, timeline, started.scheduleDriftMinutes);
  const display = getDisplayStepTimes(started, shifted[0]!);
  assert.equal(shifted[0]?.startTime, display.startTime);
  assert.equal(shifted[0]?.endTime, display.endTime);

  // The gap to the next step is unchanged by the shift.
  const plannedGap = second.startOffsetMinutes - (first.startOffsetMinutes + first.durationMinutes);
  const shiftedStartMs = getStepPlannedStartMs(schedule, first, started.scheduleDriftMinutes);
  const shiftedSecondMs = getStepPlannedStartMs(schedule, second, started.scheduleDriftMinutes);
  assert.equal(shiftedSecondMs - (shiftedStartMs + first.durationMinutes * 60_000), plannedGap * 60_000);
});

test('starting a step slightly early (within the confirm window) does not shift the plan', () => {
  const { schedule, session, first } = createStarterPrepFixture();
  const plannedStartMs = getStepPlannedStartMs(schedule, first, 0);

  const started = startTimedStep(session, first, plannedStartMs - 20 * 60_000);
  assert.equal(started.scheduleDriftMinutes, 0);
});

test('early start helpers report minutes early and when to ask first', () => {
  const { schedule, session, first } = createStarterPrepFixture();
  const plannedStartMs = getStepPlannedStartMs(schedule, first, 0);

  assert.equal(getEarlyStartMinutes(session, first, plannedStartMs - 45 * 60_000), 45);
  assert.equal(getEarlyStartMinutes(session, first, plannedStartMs + 5 * 60_000), 0);
  assert.equal(shouldConfirmEarlyStart(session, first, plannedStartMs - 30 * 60_000), false);
  assert.equal(shouldConfirmEarlyStart(session, first, plannedStartMs - 31 * 60_000), true);
  assert.equal(getMinutesUntilStep(session, first, plannedStartMs - 90 * 60_000), 90);
  assert.equal(getMinutesUntilStep(session, first, plannedStartMs + 60_000), 0);
});

test('formatDurationMinutes writes hours and minutes compactly', () => {
  assert.equal(formatDurationMinutes(883), '14h 43m');
  assert.equal(formatDurationMinutes(120), '2h');
  assert.equal(formatDurationMinutes(45), '45m');
  assert.equal(formatDurationMinutes(0), '0m');
});

test('stepEndsOnLaterDay is true when a planned step runs past midnight', () => {
  const schedule = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    mixDate: '2026-05-20',
    startTime: '09:00',
  };
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Past midnight',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const base = { id: 'x', label: 'X', startTime: '', endTime: '' };

  // 09:00 + 14h = 23:00 the same day
  const lateEvening = { ...base, startOffsetMinutes: 14 * 60, durationMinutes: 120 };
  assert.equal(stepEndsOnLaterDay(session, lateEvening), true);

  const shortStep = { ...base, startOffsetMinutes: 30, durationMinutes: 60 };
  assert.equal(stepEndsOnLaterDay(session, shortStep), false);
});

test('stepEndsOnLaterDay uses the real start and timer end while a step is running', () => {
  const schedule = { ...createDefaultScheduleInput(defaultRecipeInput), mixDate: '2026-05-20' };
  const base = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Running past midnight',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const step = { id: 'x', label: 'X', startTime: '', endTime: '', startOffsetMinutes: 0, durationMinutes: 60 };

  const startedAt = new Date(2026, 4, 20, 23, 30);
  const running = {
    ...base,
    currentStepStartedAt: startedAt.toISOString(),
    activeTimerEndsAt: new Date(startedAt.getTime() + 60 * 60_000).toISOString(),
  };
  assert.equal(stepEndsOnLaterDay(running, step), true);

  const earlier = new Date(2026, 4, 20, 10, 0);
  const sameDay = {
    ...base,
    currentStepStartedAt: earlier.toISOString(),
    activeTimerEndsAt: new Date(earlier.getTime() + 60 * 60_000).toISOString(),
  };
  assert.equal(stepEndsOnLaterDay(sameDay, step), false);
});
