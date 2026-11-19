import assert from 'node:assert/strict';
import test from 'node:test';

import { createBakeSession } from '../companion/bakeSession.ts';
import { recordCoachExchange } from '../companion/coachTranscript.ts';
import { CURRENT_BAKE_SESSION_TIMELINE_VERSION } from '../companion/migrateBakeSession.ts';
import { defaultRecipeInput } from '../recipe/defaults.ts';
import { buildTimeline, formatTimelineForDisplay } from '../schedule/buildTimeline.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import {
  BAKE_SESSION_STORAGE_KEY,
  clearBakeSession,
  loadBakeSession,
  saveBakeSession,
} from './bakeSessionStorage.ts';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

test('save and load bake session normalizes schedule defaults', () => {
  const storage = new MemoryStorage();
  const session = createBakeSession({
    savedRecipeId: 'recipe-1',
    recipeName: 'Test loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
  });

  saveBakeSession(session, storage);
  const loaded = loadBakeSession(storage);

  assert.ok(loaded);
  assert.equal(loaded.id, session.id);
  assert.equal(loaded.scheduleDriftMinutes, 0);
  assert.equal(loaded.coachQuestionsAsked, 0);
  assert.deepEqual(loaded.stepLogs, []);
});

test('loadBakeSession ignores corrupt payloads', () => {
  const storage = new MemoryStorage();
  storage.setItem(BAKE_SESSION_STORAGE_KEY, '{not json');

  assert.equal(loadBakeSession(storage), null);
});

test('clearBakeSession removes stored session', () => {
  const storage = new MemoryStorage();
  saveBakeSession(
    createBakeSession({
      savedRecipeId: null,
      recipeName: 'Temp',
      recipeInput: defaultRecipeInput,
      scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
    }),
    storage,
  );

  clearBakeSession(storage);
  assert.equal(loadBakeSession(storage), null);
});

test('coach transcript survives a save and load round trip', () => {
  const storage = new MemoryStorage();
  const session = recordCoachExchange(
    createBakeSession({
      savedRecipeId: null,
      recipeName: 'Chatty loaf',
      recipeInput: defaultRecipeInput,
      scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
    }),
    {
      question: 'Is my dough ready?',
      hadPhoto: false,
      reply: 'Look for a domed surface.',
      stepId: 'autolyse',
      stepLabel: 'Autolyse',
    },
  );

  saveBakeSession(session, storage);
  const loaded = loadBakeSession(storage);

  assert.ok(loaded);
  assert.equal(loaded.coachQuestionsAsked, 1);
  assert.deepEqual(loaded.coachTranscript, session.coachTranscript);
});

test('loadBakeSession accepts an older session saved without a coach transcript', () => {
  const storage = new MemoryStorage();
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Older loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
  });
  const legacySession = { ...session, coachQuestionsAsked: 2 };
  delete (legacySession as { coachTranscript?: unknown }).coachTranscript;

  storage.setItem(BAKE_SESSION_STORAGE_KEY, JSON.stringify(legacySession));
  const loaded = loadBakeSession(storage);

  assert.ok(loaded);
  assert.deepEqual(loaded.coachTranscript, []);
  assert.equal(loaded.coachQuestionsAsked, 2);
});

test('loadBakeSession ignores a malformed coach transcript instead of failing', () => {
  const storage = new MemoryStorage();
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Odd loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
  });

  storage.setItem(
    BAKE_SESSION_STORAGE_KEY,
    JSON.stringify({ ...session, coachTranscript: 'not an array' }),
  );
  const loaded = loadBakeSession(storage);

  assert.ok(loaded);
  assert.deepEqual(loaded.coachTranscript, []);
});

test('loadBakeSession migrates old slap-and-fold rest step index', () => {
  const storage = new MemoryStorage();
  const schedule = createDefaultScheduleInput({ ...defaultRecipeInput, hydrationPercent: 85 });
  schedule.includeStarterPrep = false;
  schedule.autolyseEnabled = false;
  schedule.slapAndFolds = 50;

  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Resume loaf',
    recipeInput: { ...defaultRecipeInput, hydrationPercent: 85 },
    scheduleInput: schedule,
  });
  const timeline = formatTimelineForDisplay(buildTimeline(session.scheduleInput, session.recipeInput));
  const slapIndex = timeline.findIndex((step) => step.id === 'slap-and-fold');

  const legacySession = {
    ...session,
    currentStepIndex: slapIndex + 1,
  };
  delete (legacySession as { timelineVersion?: number }).timelineVersion;

  storage.setItem(BAKE_SESSION_STORAGE_KEY, JSON.stringify(legacySession));
  const loaded = loadBakeSession(storage);

  assert.ok(loaded);
  assert.equal(loaded.currentStepIndex, slapIndex);
  assert.equal(loaded.timelineVersion, CURRENT_BAKE_SESSION_TIMELINE_VERSION);
});
