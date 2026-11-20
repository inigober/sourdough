import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterSavedRecipes,
  pickMostRecentRecipes,
  shouldShowSavedRecipeSearch,
  sortByRecentlyUpdated,
} from './savedRecipeList.ts';
import type { SavedRecipeSummary } from './types.ts';

function recipe(id: string, name: string, updatedAt: string, breadStyle = 'Country loaf'): SavedRecipeSummary {
  return {
    id,
    name,
    breadStyle,
    scheduleLabel: 'Mix on bake day −1',
    hasSchedule: true,
    savedAt: updatedAt,
    updatedAt,
  };
}

const recipes = [
  recipe('a', 'Weekend country', '2026-05-01T10:00:00.000Z'),
  recipe('b', 'Rye blend', '2026-05-09T10:00:00.000Z', 'Rye'),
  recipe('c', 'Broken date', 'not a date'),
  recipe('d', 'Seeded', '2026-05-05T10:00:00.000Z', 'Seeded loaf'),
];

test('sortByRecentlyUpdated puts the newest first, unreadable dates last, and does not mutate', () => {
  const before = recipes.map((item) => item.id);
  assert.deepEqual(
    sortByRecentlyUpdated(recipes).map((item) => item.id),
    ['b', 'd', 'a', 'c'],
  );
  assert.deepEqual(recipes.map((item) => item.id), before);
});

test('pickMostRecentRecipes returns the newest N and copes with small lists', () => {
  assert.deepEqual(pickMostRecentRecipes(recipes, 2).map((item) => item.id), ['b', 'd']);
  assert.deepEqual(pickMostRecentRecipes(recipes).map((item) => item.id), ['b', 'd', 'a']);
  assert.deepEqual(pickMostRecentRecipes([], 3), []);
  assert.deepEqual(pickMostRecentRecipes(recipes, 0), []);
});

test('shouldShowSavedRecipeSearch needs more than eight recipes', () => {
  assert.equal(shouldShowSavedRecipeSearch(8), false);
  assert.equal(shouldShowSavedRecipeSearch(9), true);
});

test('filterSavedRecipes matches name or bread style, ignoring case and spaces around the query', () => {
  assert.deepEqual(filterSavedRecipes(recipes, '  RYE ').map((item) => item.id), ['b']);
  assert.deepEqual(filterSavedRecipes(recipes, 'seeded').map((item) => item.id), ['d']);
  assert.equal(filterSavedRecipes(recipes, '').length, recipes.length);
  assert.deepEqual(filterSavedRecipes(recipes, 'nothing like this'), []);
});
