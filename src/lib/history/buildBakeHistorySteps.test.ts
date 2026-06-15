import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { buildTimeline, formatTimelineForDisplay } from '../schedule/buildTimeline.ts';
import {
  advanceBakeSession,
  createBakeSession,
  jumpToBakeStep,
} from '../companion/bakeSession.ts';
import {
  buildBakeHistorySteps,
  buildBakeHistoryStepsFromSession,
  finalizeBakeSessionForHistory,
} from './buildBakeHistorySteps.ts';

function buildTestTimeline(session: ReturnType<typeof createBakeSession>) {
  return formatTimelineForDisplay(buildTimeline(session.scheduleInput, session.recipeInput));
}

test('finalizeBakeSessionForHistory logs the current step on the last index', () => {
  const schedule = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    includeStarterPrep: false,
  };
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Final step loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const timeline = buildTestTimeline(session);
  const completedAtMs = Date.parse('2026-05-20T18:00:00.000Z');

  let current = session;
  while (current.currentStepIndex < timeline.length - 1) {
    const step = timeline[current.currentStepIndex] ?? null;
    current = advanceBakeSession(current, timeline.length, step);
  }

  assert.equal(current.currentStepIndex, timeline.length - 1);
  assert.equal(current.stepLogs.length, timeline.length - 1);

  const finalized = finalizeBakeSessionForHistory(current, timeline, completedAtMs);
  const lastStep = timeline[timeline.length - 1];
  const lastLog = finalized.stepLogs.find((entry) => entry.stepId === lastStep?.id);

  assert.ok(lastStep);
  assert.ok(lastLog);
  assert.equal(finalized.stepLogs.length, timeline.length);
  assert.equal(lastLog.actualStartedAt, '2026-05-20T18:00:00.000Z');
  assert.equal(lastLog.actualCompletedAt, '2026-05-20T18:00:00.000Z');
});

test('buildBakeHistorySteps excludes steps after the current index', () => {
  const schedule = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    includeStarterPrep: false,
  };
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Partial bake',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const timeline = buildTestTimeline(session);
  const completedAt = '2026-05-20T12:00:00.000Z';

  const steps = buildBakeHistorySteps(session, timeline, completedAt);

  assert.equal(steps.length, 1);
  assert.equal(steps[0]?.stepIndex, 0);
});

test('buildBakeHistoryStepsFromSession records jumped-over steps at the jump time', () => {
  const schedule = {
    ...createDefaultScheduleInput(defaultRecipeInput),
    includeStarterPrep: false,
  };
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Jumped bake',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const timeline = buildTestTimeline(session);
  const jumpTimeMs = Date.parse('2026-05-20T10:30:00.000Z');
  const jumped = jumpToBakeStep(session, 3, timeline, jumpTimeMs);
  const completedAt = '2026-05-20T18:00:00.000Z';

  assert.equal(jumped.currentStepIndex, 3);
  assert.equal(jumped.stepLogs.length, 3);

  const steps = buildBakeHistorySteps(jumped, timeline, completedAt);
  const skippedStep = steps.find((step) => step.stepIndex === 1);

  assert.ok(skippedStep);
  assert.equal(skippedStep.actualStartedAt, '2026-05-20T10:30:00.000Z');
  assert.equal(skippedStep.actualCompletedAt, '2026-05-20T10:30:00.000Z');
});
