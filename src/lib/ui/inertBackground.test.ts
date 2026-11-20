import assert from 'node:assert/strict';
import test from 'node:test';

import { holdInert, type InertTarget } from './inertBackground.ts';

function makeTarget(inert = false): InertTarget {
  return { inert };
}

test('holding makes the targets inert and releasing restores them', () => {
  const page = makeTarget();
  const release = holdInert([page]);
  assert.equal(page.inert, true);

  release();
  assert.equal(page.inert, false);
});

test('a second sheet on top keeps the page inert until both are gone', () => {
  const page = makeTarget();
  const releaseFirst = holdInert([page]);
  const releaseSecond = holdInert([page]);

  releaseSecond();
  assert.equal(page.inert, true);

  releaseFirst();
  assert.equal(page.inert, false);
});

test('closing the lower sheet first does not free the page while the upper one is open', () => {
  const page = makeTarget();
  const releaseFirst = holdInert([page]);
  const releaseSecond = holdInert([page]);

  releaseFirst();
  assert.equal(page.inert, true);

  releaseSecond();
  assert.equal(page.inert, false);
});

test('an element that was already inert stays inert afterwards', () => {
  const page = makeTarget(true);
  const release = holdInert([page]);
  release();

  assert.equal(page.inert, true);
});

test('releasing twice does not release someone else hold', () => {
  const page = makeTarget();
  const releaseFirst = holdInert([page]);
  const releaseSecond = holdInert([page]);

  releaseSecond();
  releaseSecond();
  assert.equal(page.inert, true);

  releaseFirst();
  assert.equal(page.inert, false);
});
