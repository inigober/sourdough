import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { buildTimeline, formatTimelineForDisplay } from '../schedule/buildTimeline.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { getMixDateTime } from '../schedule/mixDateTime.ts';
import { createBakeSession } from './bakeSession.ts';
import { buildCoachLiveContext, formatCoachLiveContextLines } from './coachLiveContext.ts';

function createSession() {
  const scheduleInput = createDefaultScheduleInput(defaultRecipeInput);
  scheduleInput.mixDate = '2026-11-19';
  scheduleInput.startTime = '08:00';

  return createBakeSession({
    savedRecipeId: null,
    recipeName: 'Test loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput,
  });
}

function getTimeline(session: ReturnType<typeof createSession>) {
  return formatTimelineForDisplay(buildTimeline(session.scheduleInput, session.recipeInput));
}

test('buildCoachLiveContext reports planned start without drift and excludes the current step from the log', () => {
  const session = {
    ...createSession(),
    scheduleDriftMinutes: 20,
    currentStepIndex: 1,
  };
  const timeline = getTimeline(session);
  const first = timeline[0];
  const second = timeline[1];
  assert.ok(first && second);

  session.stepLogs = [
    {
      stepIndex: 0,
      stepId: first.id,
      stepLabel: first.label,
      actualStartedAt: '2026-11-19T08:00:00.000Z',
      actualCompletedAt: '2026-11-19T08:10:00.000Z',
    },
    {
      stepIndex: 1,
      stepId: second.id,
      stepLabel: second.label,
      actualStartedAt: '2026-11-19T08:10:00.000Z',
      actualCompletedAt: '2026-11-19T08:10:00.000Z',
    },
  ];

  const live = buildCoachLiveContext(session, timeline, Date.now());

  assert.ok(live);
  assert.equal(live.stepNumber, 2);
  assert.equal(live.totalSteps, timeline.length);
  assert.equal(live.scheduleDriftMinutes, 20);
  assert.deepEqual(live.loggedStepLabels, [first.label]);
  assert.equal(
    new Date(live.plannedStepStartIso).getTime(),
    getMixDateTime(session.scheduleInput, 0).getTime() + second.startOffsetMinutes * 60_000,
  );
});

test('buildCoachLiveContext returns null when the step index is outside the timeline', () => {
  const session = { ...createSession(), currentStepIndex: 999 };

  assert.equal(buildCoachLiveContext(session, getTimeline(session)), null);
});

test('formatCoachLiveContextLines describes an on-plan bake', () => {
  const session = createSession();
  const live = buildCoachLiveContext(session, getTimeline(session));
  assert.ok(live);

  const lines = formatCoachLiveContextLines(live);

  assert.ok(lines.some((line) => /on the original plan/.test(line)));
  assert.ok(lines.some((line) => /has not been started yet/.test(line)));
  assert.ok(lines.some((line) => /Steps already logged: none yet/.test(line)));
});
