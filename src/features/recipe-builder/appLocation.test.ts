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

test('resolveAppScreen maps the Saved tab and keeps the bottom nav on it', () => {
  assert.deepEqual(
    resolveAppScreen({ tab: 'saved', phase: 'wizard' }, 'welcome', null),
    { kind: 'welcome', tab: 'saved' },
  );
  // A recipe id wins only on the home tab (recipe view routes parse to home).
  assert.deepEqual(
    resolveAppScreen({ tab: 'saved', phase: 'wizard' }, 'welcome', null, 'recipe-1'),
    { kind: 'welcome', tab: 'saved' },
  );
  assert.equal(showWelcomeBottomNav({ kind: 'welcome', tab: 'saved' }), true);
});

test('resolveAppScreen shows the recipe view for a recipe id on the home tab', () => {
  assert.deepEqual(
    resolveAppScreen({ tab: 'home', phase: 'wizard' }, 'welcome', null, 'recipe-1'),
    { kind: 'recipe', recipeId: 'recipe-1' },
  );
  assert.deepEqual(
    resolveAppScreen({ tab: 'home', phase: 'results' }, 'welcome', null, 'recipe-1'),
    { kind: 'results' },
  );
  assert.equal(showWelcomeBottomNav({ kind: 'recipe', recipeId: 'recipe-1' }), false);
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
