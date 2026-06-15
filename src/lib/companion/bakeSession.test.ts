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
  retreatBakeSession,
  startTimedStep,
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
