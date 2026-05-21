import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canAskCoachQuestion,
  COACH_MAX_QUESTIONS_PER_BAKE,
  formatCoachQuestionsRemaining,
  getCoachQuestionsRemaining,
} from './coachLimits.ts';
import { createBakeSession, incrementCoachQuestionsAsked } from './bakeSession.ts';
import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';

test('coach question limit allows five asks per bake', () => {
  assert.equal(COACH_MAX_QUESTIONS_PER_BAKE, 5);
  assert.equal(canAskCoachQuestion(0), true);
  assert.equal(canAskCoachQuestion(4), true);
  assert.equal(canAskCoachQuestion(5), false);
  assert.equal(getCoachQuestionsRemaining(3), 2);
  assert.equal(formatCoachQuestionsRemaining(4), '1 coach question left this bake');
  assert.equal(formatCoachQuestionsRemaining(5), 'No coach questions left this bake');
});

test('incrementCoachQuestionsAsked tracks usage on the bake session', () => {
  const session = createBakeSession({
    savedRecipeId: null,
    recipeName: 'Test loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
  });

  assert.equal(session.coachQuestionsAsked, 0);

  const afterOne = incrementCoachQuestionsAsked(session);
  assert.equal(afterOne.coachQuestionsAsked, 1);
});
