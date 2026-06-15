import assert from 'node:assert/strict';
import test from 'node:test';

import { formatAuthError } from './formatAuthError.ts';

test('formatAuthError maps common Supabase messages to friendly copy', () => {
  assert.match(formatAuthError('Email rate limit exceeded'), /confirmation emails/i);
  assert.match(formatAuthError('User already registered'), /signing in instead/i);
  assert.match(formatAuthError('Invalid login credentials'), /incorrect/i);
});

test('formatAuthError leaves unknown messages unchanged', () => {
  assert.equal(formatAuthError('Network timeout'), 'Network timeout');
});
