import assert from 'node:assert/strict';
import test from 'node:test';

import { APP_NAME, getDocumentTitle } from './documentTitle.ts';

test('home is just the app name', () => {
  assert.equal(getDocumentTitle('/'), APP_NAME);
});

test('each main tab names itself', () => {
  assert.equal(getDocumentTitle('/saved'), `Saved recipes · ${APP_NAME}`);
  assert.equal(getDocumentTitle('/history'), `Bake history · ${APP_NAME}`);
});

test('detail screens name what they show', () => {
  assert.equal(getDocumentTitle('/history/abc'), `Bake details · ${APP_NAME}`);
  assert.equal(getDocumentTitle('/recipe/abc'), `Recipe · ${APP_NAME}`);
});

test('wizard steps include the step name', () => {
  assert.equal(getDocumentTitle('/build/dough-size'), `New recipe: Dough size · ${APP_NAME}`);
  assert.equal(getDocumentTitle('/build/recipe-targets'), `New recipe: Hydration & salt · ${APP_NAME}`);
});

test('summary, schedule and bake mode have their own titles', () => {
  assert.equal(getDocumentTitle('/build/summary'), `Ingredient summary · ${APP_NAME}`);
  assert.equal(getDocumentTitle('/build/schedule'), `Schedule builder · ${APP_NAME}`);
  assert.equal(getDocumentTitle('/bake'), `Bake mode · ${APP_NAME}`);
});

test('a trailing slash or an unknown path falls back sensibly', () => {
  assert.equal(getDocumentTitle('/saved/'), `Saved recipes · ${APP_NAME}`);
  assert.equal(getDocumentTitle('/nonsense'), APP_NAME);
});
