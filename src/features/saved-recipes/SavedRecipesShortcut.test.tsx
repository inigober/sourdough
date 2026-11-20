import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { SavedRecipeSummary } from '../../lib/storage/types.ts';
import { SavedRecipesShortcut } from './SavedRecipesShortcut.tsx';

const recipes: SavedRecipeSummary[] = [
  {
    id: 'recipe-1',
    name: 'Country loaf',
    breadStyle: 'country',
    scheduleLabel: 'Mix on bake day −1',
    hasSchedule: true,
    savedAt: '2026-11-10T10:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z',
  },
];

describe('SavedRecipesShortcut', () => {
  it('lists recent recipes as hairline rows inside the one card, keeping Start baking accessible by name', () => {
    const html = renderToStaticMarkup(
      createElement(SavedRecipesShortcut, {
        savedRecipes: recipes,
        savedRecipesError: null,
        recipeBakeStats: {},
        onSeeAll: () => {},
        onOpenRecipe: () => {},
        onStartBake: () => {},
        onRetry: () => {},
      }),
    );

    expect(html.match(/class="card /g)).toHaveLength(1);
    expect(html).toContain('saved-shortcut-row');
    expect(html).toContain('aria-label="Start baking Country loaf"');
    expect(html).toContain('See all');
  });
});
