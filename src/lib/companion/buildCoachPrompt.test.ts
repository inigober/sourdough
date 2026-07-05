import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { buildCoachPrompt } from './buildCoachPrompt.ts';
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
