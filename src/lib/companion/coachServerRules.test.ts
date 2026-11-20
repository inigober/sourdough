import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_PHOTO_CHARS,
  MAX_QUESTIONS_PER_BAKE,
  MAX_QUESTIONS_PER_DAY,
  checkRequestSize,
  checkUsageLimits,
  readBearerToken,
} from '../../../supabase/functions/coach/usageRules.ts';
import { classifyCoachErrorDetail } from './coachErrors.ts';
import { COACH_MAX_QUESTIONS_PER_BAKE } from './coachLimits.ts';

test('readBearerToken extracts the token and rejects anything else', () => {
  assert.equal(readBearerToken('Bearer abc.def.ghi'), 'abc.def.ghi');
  assert.equal(readBearerToken('bearer abc'), 'abc');
  assert.equal(readBearerToken(null), null);
  assert.equal(readBearerToken(''), null);
  assert.equal(readBearerToken('Basic abc'), null);
  assert.equal(readBearerToken('Bearer'), null);
});

test('the per-bake limit blocks the sixth question and leaves the fifth open', () => {
  assert.equal(checkUsageLimits({ askedForBake: MAX_QUESTIONS_PER_BAKE - 1, askedToday: 0 }).ok, true);

  const blocked = checkUsageLimits({ askedForBake: MAX_QUESTIONS_PER_BAKE, askedToday: 0 });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.ok === false && blocked.status, 429);
});

test('the daily limit blocks across bakes, even when the bake count is fresh', () => {
  const blocked = checkUsageLimits({ askedForBake: 0, askedToday: MAX_QUESTIONS_PER_DAY });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.ok === false && blocked.status, 429);
});

test('without a bake id (older app), only the daily limit applies', () => {
  assert.equal(checkUsageLimits({ askedForBake: null, askedToday: 3 }).ok, true);
  assert.equal(checkUsageLimits({ askedForBake: null, askedToday: MAX_QUESTIONS_PER_DAY }).ok, false);
});

test('oversized prompts, questions and photos are refused', () => {
  const small = { system: 'a', user: 'b' };
  assert.equal(checkRequestSize(small).ok, true);
  assert.equal(checkRequestSize({ ...small, system: 'x'.repeat(12_001) }).ok, false);
  assert.equal(checkRequestSize({ ...small, user: 'x'.repeat(8_001) }).ok, false);
  assert.equal(checkRequestSize({ ...small, photoDataUrl: 'x'.repeat(MAX_PHOTO_CHARS + 1) }).ok, false);
  assert.equal(checkRequestSize({ ...small, bakeSessionId: 'x'.repeat(101) }).ok, false);
});

test('the server and the app agree on the per-bake limit and recognise each other\'s messages', () => {
  assert.equal(MAX_QUESTIONS_PER_BAKE, COACH_MAX_QUESTIONS_PER_BAKE);

  const bakeLimit = checkUsageLimits({ askedForBake: MAX_QUESTIONS_PER_BAKE, askedToday: 0 });
  const dayLimit = checkUsageLimits({ askedForBake: 0, askedToday: MAX_QUESTIONS_PER_DAY });
  assert.equal(bakeLimit.ok === false && classifyCoachErrorDetail(bakeLimit.error), 'limit');
  assert.equal(dayLimit.ok === false && classifyCoachErrorDetail(dayLimit.error), 'daily-limit');
});
