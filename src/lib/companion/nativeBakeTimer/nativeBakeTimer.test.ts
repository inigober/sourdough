import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../../schedule/defaults.ts';
import { buildTimeline, formatTimelineForDisplay } from '../../schedule/buildTimeline.ts';
import { createBakeSession, startTimedStep } from '../bakeSession.ts';
import { createBakeTimerId } from './createBakeTimerId.ts';
import {
  deriveDesiredNativeBakeTimer,
  getNativeBakeTimerSyncKey,
} from './deriveDesiredNativeBakeTimer.ts';

test('createBakeTimerId combines session and step ids', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Test loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const timeline = formatTimelineForDisplay(buildTimeline(schedule, defaultRecipeInput));
  const step = timeline[0];

  assert.ok(step);
  assert.equal(createBakeTimerId(session, step), `${session.id}:${step.id}`);
});

test('deriveDesiredNativeBakeTimer returns schedule payload while timer runs', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = false;

  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Country loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const timeline = formatTimelineForDisplay(buildTimeline(schedule, defaultRecipeInput));
  const autolyse = timeline.find((step) => step.id === 'autolyse');

  assert.ok(autolyse);
  const expectedDurationMinutes = autolyse.durationMinutes;
  assert.ok(expectedDurationMinutes > 0);

  const startedAt = Date.parse('2026-05-20T10:00:00.000Z');
  const started = startTimedStep(session, autolyse, startedAt);
  const desired = deriveDesiredNativeBakeTimer(started, autolyse, startedAt + 5 * 60_000);

  assert.ok(desired);
  assert.equal(desired.timerId, `${session.id}:autolyse`);
  assert.equal(desired.durationSeconds, (expectedDurationMinutes - 5) * 60);
  assert.equal(desired.endsAtIso, started.activeTimerEndsAt);
  assert.equal(desired.title, autolyse.label);
  assert.equal(desired.recipeName, 'Country loaf');
  assert.equal(desired.deepLinkUrl, 'sourdough://bake');
});

test('deriveDesiredNativeBakeTimer returns null when no timer is running', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Test loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const timeline = formatTimelineForDisplay(buildTimeline(schedule, defaultRecipeInput));
  const step = timeline[0];

  assert.ok(step);
  assert.equal(deriveDesiredNativeBakeTimer(session, step), null);
});

test('deriveDesiredNativeBakeTimer returns null when the timer has already expired', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);
  schedule.includeStarterPrep = false;

  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Country loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: schedule,
  });
  const timeline = formatTimelineForDisplay(buildTimeline(schedule, defaultRecipeInput));
  const autolyse = timeline.find((step) => step.id === 'autolyse');

  assert.ok(autolyse);
  const startedAt = Date.parse('2026-05-20T10:00:00.000Z');
  const started = startTimedStep(session, autolyse, startedAt);
  const afterExpiry = startedAt + (autolyse.durationMinutes + 1) * 60_000;

  assert.equal(deriveDesiredNativeBakeTimer(started, autolyse, afterExpiry), null);
});

test('getNativeBakeTimerSyncKey changes when timer restarts', () => {
  const timer = {
    timerId: 'session:autolyse',
    durationSeconds: 1800,
    endsAtIso: '2026-05-20T10:30:00.000Z',
    title: 'Autolyse',
    recipeName: 'Loaf',
    bakeSessionId: 'session',
    deepLinkUrl: 'sourdough://bake',
  };

  const restarted = { ...timer, endsAtIso: '2026-05-20T10:45:00.000Z' };

  assert.notEqual(getNativeBakeTimerSyncKey(timer), getNativeBakeTimerSyncKey(restarted));
});
