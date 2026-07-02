import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { buildTimeline, formatTimelineForDisplay } from '../schedule/buildTimeline.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { createBakeSession } from './bakeSession.ts';
import {
  CURRENT_BAKE_SESSION_TIMELINE_VERSION,
  migrateBakeSession,
} from './migrateBakeSession.ts';

function createSlapFoldSession() {
  const schedule = createDefaultScheduleInput({ ...defaultRecipeInput, hydrationPercent: 85 });
  schedule.includeStarterPrep = false;
  schedule.autolyseEnabled = false;
  schedule.slapAndFolds = 50;

  return createBakeSession({
    savedRecipeId: 'recipe-1',
    recipeName: 'Slap fold loaf',
    recipeInput: { ...defaultRecipeInput, hydrationPercent: 85 },
    scheduleInput: schedule,
  });
}

function getSlapFoldIndex(session: ReturnType<typeof createSlapFoldSession>): number {
  const timeline = formatTimelineForDisplay(buildTimeline(session.scheduleInput, session.recipeInput));
  return timeline.findIndex((step) => step.id === 'slap-and-fold');
}

test('migrateBakeSession maps old rest-after-slap index to merged slap-and-fold step', () => {
  const session = createSlapFoldSession();
  const slapIndex = getSlapFoldIndex(session);

  const migrated = migrateBakeSession({
    ...session,
    timelineVersion: 1,
    currentStepIndex: slapIndex + 1,
  });

  assert.equal(migrated.currentStepIndex, slapIndex);
  assert.equal(migrated.timelineVersion, CURRENT_BAKE_SESSION_TIMELINE_VERSION);
});

test('migrateBakeSession decrements indices after removed rest-after-slap step', () => {
  const session = createSlapFoldSession();
  const slapIndex = getSlapFoldIndex(session);

  const migrated = migrateBakeSession({
    ...session,
    timelineVersion: 1,
    currentStepIndex: slapIndex + 2,
  });

  assert.equal(migrated.currentStepIndex, slapIndex + 1);
});

test('migrateBakeSession leaves earlier indices unchanged', () => {
  const session = createSlapFoldSession();
  const slapIndex = getSlapFoldIndex(session);

  const migrated = migrateBakeSession({
    ...session,
    timelineVersion: 1,
    currentStepIndex: Math.max(0, slapIndex - 1),
  });

  assert.equal(migrated.currentStepIndex, Math.max(0, slapIndex - 1));
});

test('migrateBakeSession remaps rest-after-slap step logs', () => {
  const session = createSlapFoldSession();

  const migrated = migrateBakeSession({
    ...session,
    timelineVersion: 1,
    stepLogs: [
      {
        stepIndex: 4,
        stepId: 'rest-after-slap',
        stepLabel: 'Rest after slap and folds',
        actualStartedAt: '2026-07-02T10:00:00.000Z',
        actualCompletedAt: '2026-07-02T10:30:00.000Z',
      },
    ],
  });

  assert.equal(migrated.stepLogs[0]?.stepId, 'slap-and-fold');
  assert.equal(migrated.stepLogs[0]?.stepLabel, 'Slap and folds');
});

test('migrateBakeSession is a no-op for current timeline version', () => {
  const session = createSlapFoldSession();

  const migrated = migrateBakeSession({
    ...session,
    currentStepIndex: 3,
  });

  assert.equal(migrated.currentStepIndex, 3);
  assert.equal(migrated.timelineVersion, CURRENT_BAKE_SESSION_TIMELINE_VERSION);
});
