import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { buildTimeline, formatTimelineForDisplay } from '../schedule/buildTimeline.ts';
import {
  advanceBakeSession,
  createBakeSession,
  isBakeSessionComplete,
  jumpToBakeStep,
  getForwardStepSkipCount,
  restoreBakeSessionSnapshot,
  restartStepTimer,
  retreatBakeSession,
  startTimedStep,
  toBakeSessionSummary,
  updateBakeSessionSchedule,
} from './bakeSession.ts';

function buildTestTimeline(session: ReturnType<typeof createBakeSession>) {
  return formatTimelineForDisplay(buildTimeline(session.scheduleInput, session.recipeInput));
}

test('bake session advances and retreats through steps', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = false;

  const session = createBakeSession({
    savedRecipeId: 'recipe-1',
    recipeName: 'Test loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const timeline = buildTestTimeline(session);

  assert.equal(session.currentStepIndex, 0);
  assert.equal(session.activeTimerEndsAt, null);
  assert.equal(isBakeSessionComplete(session, timeline.length), false);

  let current = advanceBakeSession(session, timeline.length, timeline[0] ?? null);
  assert.equal(current.currentStepIndex, 1);

  while (!isBakeSessionComplete(current, timeline.length)) {
    const step = timeline[current.currentStepIndex] ?? null;
    current = advanceBakeSession(current, timeline.length, step);
  }

  assert.equal(isBakeSessionComplete(current, timeline.length), true);
  assert.equal(current.currentStepIndex, timeline.length - 1);

  const retreated = retreatBakeSession(current);
  assert.equal(retreated.currentStepIndex, timeline.length - 2);
});

test('jumpToBakeStep logs skipped steps when jumping forward', () => {
  const schedule = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    includeStarterPrep: false,
  };
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Jump test',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const timeline = buildTestTimeline(session);
  const jumpTimeMs = Date.parse('2026-05-20T11:00:00.000Z');

  const jumped = jumpToBakeStep(session, 2, timeline, jumpTimeMs);

  assert.equal(jumped.currentStepIndex, 2);
  assert.equal(jumped.stepLogs.length, 2);
  assert.equal(jumped.stepLogs[0]?.stepId, timeline[0]?.id);
  assert.equal(jumped.stepLogs[1]?.stepId, timeline[1]?.id);
  assert.equal(jumped.stepLogs[0]?.actualStartedAt, '2026-05-20T11:00:00.000Z');
  assert.equal(jumped.stepLogs[1]?.actualCompletedAt, '2026-05-20T11:00:00.000Z');
  assert.equal(jumped.currentStepStartedAt, null);
  assert.equal(jumped.activeTimerEndsAt, null);
});

test('timed steps start only when the baker presses start', () => {
  const schedule = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    includeStarterPrep: false,
    autolyseEnabled: true,
    autolyseMinutes: 30,
  };

  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Timed loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const timeline = buildTestTimeline(session);
  const autolyse = timeline.find((step) => step.id === 'autolyse');

  assert.ok(autolyse);
  assert.equal(session.activeTimerEndsAt, null);

  const started = startTimedStep(session, autolyse);
  assert.ok(started.activeTimerEndsAt);
  assert.ok(started.currentStepStartedAt);
});

test('updateBakeSessionSchedule replaces schedule and clears active timers', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  const session = {
    ...createBakeSession({
      savedRecipeId: null,
      recipeName: 'Edited schedule',
      recipeInput: defaultRecipeInput,
      scheduleInput: schedule,
    }),
    currentStepStartedAt: '2026-05-20T09:00:00.000Z',
    activeTimerEndsAt: '2026-05-20T09:30:00.000Z',
  };

  const updated = updateBakeSessionSchedule(session, {
    ...schedule,
    autolyseMinutes: 45,
  });

  assert.equal(updated.scheduleInput.autolyseMinutes, 45);
  assert.equal(updated.currentStepStartedAt, null);
  assert.equal(updated.activeTimerEndsAt, null);
});

test('restartStepTimer resets the current timed step from now', () => {
  const schedule = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    includeStarterPrep: false,
    autolyseEnabled: true,
    autolyseMinutes: 30,
  };
  const timeline = buildTestTimeline(
    createBakeSession({
      savedRecipeId: null,
      recipeName: 'Restart timer',
      recipeInput: defaultRecipeInput,
      scheduleInput: schedule,
    }),
  );
  const autolyse = timeline.find((step) => step.id === 'autolyse');
  assert.ok(autolyse);

  const now = Date.parse('2026-05-20T10:00:00.000Z');
  const restarted = restartStepTimer(
    createBakeSession({
      savedRecipeId: null,
      recipeName: 'Restart timer',
      recipeInput: defaultRecipeInput,
      scheduleInput: schedule,
    }),
    autolyse,
    now,
  );

  assert.equal(restarted.currentStepStartedAt, '2026-05-20T10:00:00.000Z');
  assert.equal(restarted.activeTimerEndsAt, '2026-05-20T10:30:00.000Z');
});

test('restartStepTimer is a no-op for untimed steps', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Untimed',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const timeline = buildTestTimeline(session);
  const untimed = timeline.find((step) => step.durationMinutes === 0);

  assert.ok(untimed);
  assert.deepEqual(restartStepTimer(session, untimed), session);
});

test('toBakeSessionSummary exposes resume card fields', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  const session = createBakeSession({
    savedRecipeId: 'recipe-1',
    recipeName: 'Resume me',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });

  assert.deepEqual(toBakeSessionSummary(session), {
    recipeName: 'Resume me',
    currentStepIndex: 0,
    updatedAt: session.updatedAt,
  });
});

function createStepLogTestSession() {
  const schedule = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    includeStarterPrep: false,
  };
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Step log loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });

  return { session, timeline: buildTestTimeline(session) };
}

test('Previous removes the step log of the step you return to', () => {
  const { session, timeline } = createStepLogTestSession();
  const first = timeline[0];
  assert.ok(first);

  // Review bug: after Next then Previous the step stayed logged as completed while current.
  const advanced = advanceBakeSession(session, timeline.length, first);
  assert.equal(advanced.stepLogs.some((entry) => entry.stepId === first.id), true);

  const retreated = retreatBakeSession(advanced);
  assert.equal(retreated.currentStepIndex, 0);
  assert.equal(retreated.stepLogs.some((entry) => entry.stepId === first.id), false);
});

test('Previous keeps logs of steps before the one you return to', () => {
  const { session, timeline } = createStepLogTestSession();
  const jumped = jumpToBakeStep(session, 3, timeline);
  assert.deepEqual(
    jumped.stepLogs.map((entry) => entry.stepIndex),
    [0, 1, 2],
  );

  const retreated = retreatBakeSession(jumped);
  assert.equal(retreated.currentStepIndex, 2);
  assert.deepEqual(
    retreated.stepLogs.map((entry) => entry.stepIndex),
    [0, 1],
  );
});

test('jumping backward also removes logs from the target step onward', () => {
  const { session, timeline } = createStepLogTestSession();
  const jumped = jumpToBakeStep(session, 4, timeline);
  const back = jumpToBakeStep(jumped, 1, timeline);

  assert.equal(back.currentStepIndex, 1);
  assert.deepEqual(
    back.stepLogs.map((entry) => entry.stepIndex),
    [0],
  );
});

test('getForwardStepSkipCount counts steps left behind by a forward jump only', () => {
  const { session } = createStepLogTestSession();
  const atStepTwo = { ...session, currentStepIndex: 2 };

  assert.equal(getForwardStepSkipCount(atStepTwo, 3), 1);
  assert.equal(getForwardStepSkipCount(atStepTwo, 5), 3);
  assert.equal(getForwardStepSkipCount(atStepTwo, 2), 0);
  assert.equal(getForwardStepSkipCount(atStepTwo, 0), 0);
});

test('restoreBakeSessionSnapshot undoes a step change but keeps the coach question count', () => {
  const { session, timeline } = createStepLogTestSession();
  const first = timeline[0];
  assert.ok(first);

  const snapshot = session;
  const advanced = advanceBakeSession(session, timeline.length, first);
  const afterCoach = { ...advanced, coachQuestionsAsked: 2 };

  const restored = restoreBakeSessionSnapshot(afterCoach, snapshot);
  assert.equal(restored.currentStepIndex, 0);
  assert.equal(restored.stepLogs.length, 0);
  assert.equal(restored.coachQuestionsAsked, 2);
});
