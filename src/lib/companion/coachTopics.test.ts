import assert from 'node:assert/strict';
import test from 'node:test';

import { getCoachQuickQuestions, getCoachTopicForStepId } from './coachTopics.ts';

test('every step gets three or four quick questions', () => {
  const stepIds = [
    'refresh-starter',
    'build-levain',
    'autolyse',
    'mix-levain',
    'stretch-fold-2',
    'slap-and-fold',
    'pre-shape',
    'shape',
    'cold-retard',
    'room-proof',
    'bake-closed',
  ];

  for (const stepId of stepIds) {
    const questions = getCoachQuickQuestions(stepId);
    assert.ok(questions.length >= 3 && questions.length <= 4, `${stepId} has ${questions.length}`);
  }
});

test('quick questions follow the step type', () => {
  assert.ok(getCoachQuickQuestions('stretch-fold-1').includes('Is my dough ready?'));
  assert.ok(getCoachQuickQuestions('stretch-fold-1').includes('It feels too wet'));
  assert.ok(getCoachQuickQuestions('autolyse').includes('Is sticky dough normal here?'));
  assert.ok(getCoachQuickQuestions('build-levain').includes('Is my starter active enough?'));
});

test('autolyse quick questions never nudge the baker to change the recipe', () => {
  for (const question of getCoachQuickQuestions('autolyse')) {
    assert.doesNotMatch(question, /add (more )?(water|flour)/i);
  }
});

test('timeline step ids map to the five coach topics', () => {
  assert.equal(getCoachTopicForStepId('autolyse'), 'autolyse');
  assert.equal(getCoachTopicForStepId('mix-levain'), 'bulk');
  assert.equal(getCoachTopicForStepId('stretch-fold-1'), 'bulk');
  assert.equal(getCoachTopicForStepId('pre-shape'), 'shape');
  assert.equal(getCoachTopicForStepId('shape'), 'shape');
  assert.equal(getCoachTopicForStepId('room-proof'), 'proof');
  assert.equal(getCoachTopicForStepId('cold-retard'), 'proof');
  assert.equal(getCoachTopicForStepId('bake-closed'), 'bake');
});
