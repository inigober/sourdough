import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveAppScreen, showHomeButton, showWelcomeBottomNav } from './appLocation.ts';

test('resolveAppScreen maps build phases to route-ready screens', () => {
  assert.deepEqual(
    resolveAppScreen({ tab: 'home', phase: 'results' }, 'welcome', null),
    { kind: 'results' },
  );
  assert.deepEqual(
    resolveAppScreen({ tab: 'home', phase: 'schedule' }, 'fermentation', null),
    { kind: 'schedule' },
  );
  assert.deepEqual(
    resolveAppScreen({ tab: 'home', phase: 'companion' }, 'welcome', null),
    { kind: 'companion' },
  );
  assert.deepEqual(
    resolveAppScreen({ tab: 'home', phase: 'wizard' }, 'flour', null),
    { kind: 'wizard', step: 'flour' },
  );
});

test('resolveAppScreen maps welcome tab and history detail', () => {
  assert.deepEqual(
    resolveAppScreen({ tab: 'home', phase: 'wizard' }, 'welcome', null),
    { kind: 'welcome', tab: 'home' },
  );
  assert.deepEqual(
    resolveAppScreen({ tab: 'history', phase: 'wizard' }, 'welcome', 'bake-1'),
    { kind: 'welcome', tab: 'history', historyId: 'bake-1' },
  );
});

test('showWelcomeBottomNav is true only on welcome list screens', () => {
  assert.equal(showWelcomeBottomNav({ kind: 'welcome', tab: 'home' }), true);
  assert.equal(showWelcomeBottomNav({ kind: 'welcome', tab: 'history', historyId: null }), true);
  assert.equal(showWelcomeBottomNav({ kind: 'welcome', tab: 'history', historyId: 'bake-1' }), false);
  assert.equal(showWelcomeBottomNav({ kind: 'wizard', step: 'doughSize' }), false);
});

test('showHomeButton hides on welcome home', () => {
  assert.equal(showHomeButton({ tab: 'home', phase: 'wizard' }, 'welcome'), false);
  assert.equal(showHomeButton({ tab: 'home', phase: 'wizard' }, 'doughSize'), true);
  assert.equal(showHomeButton({ tab: 'home', phase: 'results' }, 'welcome'), true);
});
