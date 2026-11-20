import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyCoachErrorDetail,
  getCoachFailureMessage,
  isRetryableCoachFailure,
} from './coachErrors.ts';

test('classifyCoachErrorDetail recognises limit and configuration errors', () => {
  assert.equal(classifyCoachErrorDetail('Question limit reached (5 per bake).'), 'limit');
  assert.equal(classifyCoachErrorDetail('Coach is not configured on the server.'), 'not-configured');
  assert.equal(classifyCoachErrorDetail('Rate limit reached for gpt-4o-mini'), 'unavailable');
});

test('classifyCoachErrorDetail recognises the sign-in and daily-limit errors from the server', () => {
  assert.equal(classifyCoachErrorDetail('Sign in required to use the coach.'), 'sign-in');
  assert.equal(classifyCoachErrorDetail('Daily coach limit reached. Try again tomorrow.'), 'daily-limit');
});

test('failure messages never include raw error detail', () => {
  const reasons = ['limit', 'daily-limit', 'sign-in', 'not-configured', 'empty-reply', 'unavailable'] as const;
  for (const reason of reasons) {
    assert.doesNotMatch(getCoachFailureMessage(reason), /\{|openai|502|Error:/i);
  }
});

test('retryable copy tells the baker the question was kept and not counted', () => {
  assert.match(getCoachFailureMessage('unavailable'), /wasn't counted/);
  assert.match(getCoachFailureMessage('empty-reply'), /wasn't counted/);
});

test('only transient failures offer Retry', () => {
  assert.equal(isRetryableCoachFailure('unavailable'), true);
  assert.equal(isRetryableCoachFailure('empty-reply'), true);
  assert.equal(isRetryableCoachFailure('limit'), false);
  assert.equal(isRetryableCoachFailure('daily-limit'), false);
  assert.equal(isRetryableCoachFailure('sign-in'), false);
  assert.equal(isRetryableCoachFailure('not-configured'), false);
});
