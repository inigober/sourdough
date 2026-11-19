import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { buildCoachPrompt } from './buildCoachPrompt.ts';
import type { CoachLiveContext } from './coachLiveContext.ts';
import { getCoachTipForStep } from './coachStepTips.ts';

test('coach prompt includes step, recipe, and default tip context', () => {
  const prompt = buildCoachPrompt({
    topic: 'bulk',
    stepId: 'stretch-fold-1',
    stepLabel: 'Stretch and fold 1',
    stepDetail: '30 min rest',
    recipeName: 'Weekday boule',
    recipeInput: defaultRecipeInput,
    scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
    userQuestion: 'How do I know if I folded enough?',
  });

  assert.match(prompt.system, /2–4 short sentences/i);
  assert.match(prompt.system, /do not guess/i);
  assert.match(prompt.user, /Weekday boule/);
  assert.match(prompt.user, /Stretch and fold 1/);
  assert.match(prompt.user, /stretch-fold-1/);
  assert.match(prompt.user, /How do I know if I folded enough\?/);
  assert.equal(
    prompt.user.includes(getCoachTipForStep('stretch-fold-1', 'Stretch and fold 1')),
    true,
  );
});

test('coach prompt notes when a photo is attached', () => {
  const prompt = buildCoachPrompt({
    topic: 'proof',
    stepId: 'room-proof',
    stepLabel: 'Room-temperature proof',
    recipeName: 'Test loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
    hasPhoto: true,
  });

  assert.match(prompt.user, /attached a photo/i);
  assert.match(prompt.system, /photo is attached/i);
});

test('coach system prompt states the planned hydration and forbids changing amounts', () => {
  const recipeInput = { ...defaultRecipeInput, hydrationPercent: 78 };
  const prompt = buildCoachPrompt({
    topic: 'autolyse',
    stepId: 'autolyse',
    stepLabel: 'Autolyse',
    recipeName: 'Test loaf',
    recipeInput,
    scheduleInput: createDefaultScheduleInput(recipeInput),
    userQuestion: 'My dough is sticky, is that normal?',
  });

  assert.match(prompt.system, /planned hydration is 78%/);
  assert.match(prompt.system, /never recommend adding or removing water, flour, salt, or starter/i);
  assert.match(prompt.system, /never suggest changing the hydration or any ingredient amount/i);
  assert.match(prompt.system, /technique only/i);
  assert.match(prompt.system, /sticky, shaggy dough is expected/i);
});

test('hydration constraints are present for every coach topic, not just autolyse', () => {
  const topics = ['autolyse', 'bulk', 'shape', 'proof', 'bake'] as const;
  for (const topic of topics) {
    const prompt = buildCoachPrompt({
      topic,
      stepId: topic === 'bake' ? 'bake-closed' : topic,
      stepLabel: topic,
      recipeName: 'Test loaf',
      recipeInput: defaultRecipeInput,
      scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
    });

    assert.match(prompt.system, /never recommend adding or removing water/i, topic);
  }
});

function createLiveContext(overrides: Partial<CoachLiveContext> = {}): CoachLiveContext {
  return {
    stepNumber: 3,
    totalSteps: 12,
    plannedStepStartIso: new Date(2026, 10, 19, 9, 0).toISOString(),
    scheduleDriftMinutes: 25,
    stepStartedAtIso: new Date(2026, 10, 19, 9, 25).toISOString(),
    stepDurationMinutes: 45,
    loggedStepLabels: ['Refresh starter', 'Build levain'],
    nowIso: new Date(2026, 10, 19, 9, 40).toISOString(),
    ...overrides,
  };
}

test('coach prompt includes live bake progress when provided', () => {
  const prompt = buildCoachPrompt({
    topic: 'autolyse',
    stepId: 'autolyse',
    stepLabel: 'Autolyse',
    recipeName: 'Test loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
    liveContext: createLiveContext(),
  });

  assert.match(prompt.user, /Bake progress right now/);
  assert.match(prompt.user, /step 3 of 12/);
  assert.match(prompt.user, /Planned start of this step \(original plan\): 09:00/);
  assert.match(prompt.user, /Actual start of this step: 09:25 \(15 min ago\)/);
  assert.match(prompt.user, /running 25 min behind the original plan/);
  assert.match(prompt.user, /Steps already logged: Refresh starter, Build levain/);
});

test('coach prompt copes with an unstarted step and no logged steps', () => {
  const prompt = buildCoachPrompt({
    topic: 'bulk',
    stepId: 'mix-levain',
    stepLabel: 'Mix levain',
    recipeName: 'Test loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
    liveContext: createLiveContext({
      stepStartedAtIso: null,
      scheduleDriftMinutes: -10,
      loggedStepLabels: [],
    }),
  });

  assert.match(prompt.user, /has not been started yet/);
  assert.match(prompt.user, /running 10 min ahead of the original plan/);
  assert.match(prompt.user, /Steps already logged: none yet/);
});

test('coach prompt omits the progress block without live context', () => {
  const prompt = buildCoachPrompt({
    topic: 'bulk',
    stepId: 'mix-levain',
    stepLabel: 'Mix levain',
    recipeName: 'Test loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
  });

  assert.doesNotMatch(prompt.user, /Bake progress right now/);
});
