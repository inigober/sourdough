import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APP_ROUTES,
  buildAppPathFromDraft,
  isKnownAppPath,
  parseAppRoute,
} from './appRoutes.ts';

test('parseAppRoute maps URLs to app location and wizard step', () => {
  assert.deepEqual(parseAppRoute('/'), {
    location: { tab: 'home', phase: 'wizard' },
    wizardStep: 'welcome',
    historyDetailId: null,
  });
  assert.deepEqual(parseAppRoute('/history'), {
    location: { tab: 'history', phase: 'wizard' },
    wizardStep: 'welcome',
    historyDetailId: null,
  });
  assert.deepEqual(parseAppRoute('/history/bake-42'), {
    location: { tab: 'history', phase: 'wizard' },
    wizardStep: 'welcome',
    historyDetailId: 'bake-42',
  });
  assert.deepEqual(parseAppRoute('/build/dough-size'), {
    location: { tab: 'home', phase: 'wizard' },
    wizardStep: 'doughSize',
    historyDetailId: null,
  });
  assert.deepEqual(parseAppRoute('/build/summary'), {
    location: { tab: 'home', phase: 'results' },
    wizardStep: 'welcome',
    historyDetailId: null,
  });
  assert.deepEqual(parseAppRoute('/build/schedule'), {
    location: { tab: 'home', phase: 'schedule' },
    wizardStep: 'welcome',
    historyDetailId: null,
  });
  assert.deepEqual(parseAppRoute('/bake'), {
    location: { tab: 'home', phase: 'companion' },
    wizardStep: 'welcome',
    historyDetailId: null,
  });
});

test('isKnownAppPath accepts canonical routes only', () => {
  assert.equal(isKnownAppPath('/'), true);
  assert.equal(isKnownAppPath('/build/flour'), true);
  assert.equal(isKnownAppPath('/build/unknown-step'), false);
  assert.equal(isKnownAppPath('/settings'), false);
});

test('buildAppPathFromDraft restores draft navigation targets', () => {
  assert.equal(
    buildAppPathFromDraft({ phase: 'wizard', currentStep: 'recipeTargets' }),
    APP_ROUTES.buildStep('recipeTargets'),
  );
  assert.equal(
    buildAppPathFromDraft({ phase: 'results', currentStep: 'fermentation' }),
    APP_ROUTES.buildSummary,
  );
  assert.equal(
    buildAppPathFromDraft({ phase: 'schedule', currentStep: 'welcome' }),
    APP_ROUTES.buildSchedule,
  );
});
