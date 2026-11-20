import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { RecipeBakeStats } from '../../lib/history/recipeBakeStats.ts';
import type { SavedRecipeSummary } from '../../lib/storage/types.ts';
import { SavedRecipeCard } from './SavedRecipeCard.tsx';

const recipe: SavedRecipeSummary = {
  id: 'recipe-1',
  name: 'Dark wheat moderate hydration',
  breadStyle: 'country',
  scheduleLabel: 'Mix on bake day −1',
  hasSchedule: true,
  savedAt: '2026-11-10T10:00:00.000Z',
  updatedAt: '2026-11-12T10:00:00.000Z',
};

function render(overrides: Partial<SavedRecipeSummary> = {}, bakeStats?: RecipeBakeStats): string {
  return renderToStaticMarkup(
    createElement(
      'ul',
      null,
      createElement(SavedRecipeCard, {
        recipe: { ...recipe, ...overrides },
        bakeStats,
        onOpen: () => {},
        onStartBake: () => {},
        onDuplicate: () => {},
      }),
    ),
  );
}

describe('SavedRecipeCard', () => {
  it('is a flat row with Start baking as the one primary button and Duplicate secondary', () => {
    const html = render();

    expect(html).toContain('saved-recipe-row');
    expect(html).toMatch(/class="button button--primary[^"]*"[^>]*aria-label="Start baking Dark wheat moderate hydration"/);
    expect(html).toMatch(/class="button button--secondary[^"]*"[^>]*aria-label="Duplicate Dark wheat moderate hydration"/);
    expect(html.match(/button--primary/g)).toHaveLength(1);
  });

  it('shows one muted meta line: bake stats when there are bakes, otherwise the updated date', () => {
    expect(render()).toContain('Updated ');
    const withStats = render({}, { bakeCount: 3, lastCompletedAt: '2026-11-12T20:00:00.000Z', lastAssessment: 'great' });

    expect(withStats).toContain('Baked 3x · last: Great loaf');
    expect(withStats).not.toContain('Updated ');
    expect(withStats.match(/saved-recipe-row__meta/g)).toHaveLength(1);
  });

  it('offers only Duplicate when the recipe has no schedule yet, and says why', () => {
    const html = render({ hasSchedule: false, scheduleLabel: 'No schedule yet' });

    expect(html).not.toContain('Start baking');
    expect(html).toContain('Duplicate');
    expect(html).toContain('No schedule yet');
  });
});
