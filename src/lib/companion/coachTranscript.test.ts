import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { createBakeSession } from './bakeSession.ts';
import { normalizeCoachTranscript, recordCoachExchange } from './coachTranscript.ts';

function createSession() {
  return createBakeSession({
    savedRecipeId: null,
    recipeName: 'Test loaf',
    recipeInput: defaultRecipeInput,
    scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
  });
}

const exchange = {
  question: 'Is my dough ready?',
  hadPhoto: false,
  reply: 'Look for a domed surface.',
  stepId: 'autolyse',
  stepLabel: 'Autolyse',
};

test('recordCoachExchange appends question and reply and spends one quota slot', () => {
  const session = createSession();
  const next = recordCoachExchange(session, exchange);

  assert.equal(next.coachQuestionsAsked, 1);
  assert.equal(next.coachTranscript?.length, 2);
  assert.deepEqual(
    next.coachTranscript?.map((message) => [message.role, message.text, message.stepId]),
    [
      ['user', 'Is my dough ready?', 'autolyse'],
      ['assistant', 'Look for a domed surface.', 'autolyse'],
    ],
  );
  assert.equal(session.coachTranscript, undefined, 'does not mutate the input session');
});

test('recordCoachExchange flags photos without storing them', () => {
  const next = recordCoachExchange(createSession(), { ...exchange, hadPhoto: true });
  const [userMessage, assistantMessage] = next.coachTranscript ?? [];

  assert.equal(userMessage?.hadPhoto, true);
  assert.equal(assistantMessage?.hadPhoto, undefined);
  assert.equal(JSON.stringify(next).includes('data:image'), false);
});

test('recordCoachExchange keeps earlier messages across exchanges', () => {
  let session = createSession();
  session = recordCoachExchange(session, exchange);
  session = recordCoachExchange(session, { ...exchange, question: 'And now?', reply: 'Wait.' });

  assert.equal(session.coachQuestionsAsked, 2);
  assert.equal(session.coachTranscript?.length, 4);
  assert.equal(session.coachTranscript?.[2]?.text, 'And now?');
});

test('normalizeCoachTranscript treats a missing field as an empty transcript', () => {
  assert.deepEqual(normalizeCoachTranscript(undefined), []);
  assert.deepEqual(normalizeCoachTranscript(null), []);
  assert.deepEqual(normalizeCoachTranscript('nope'), []);
});

test('normalizeCoachTranscript drops malformed entries and keeps valid ones', () => {
  const valid = recordCoachExchange(createSession(), exchange).coachTranscript ?? [];
  const result = normalizeCoachTranscript([...valid, { id: 1 }, null, { ...valid[0], role: 'system' }]);

  assert.equal(result.length, 2);
});
