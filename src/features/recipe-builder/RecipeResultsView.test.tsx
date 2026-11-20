import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { assessRecipe } from '../../lib/recipe/assessRecipe.ts';
import { calculateRecipe } from '../../lib/recipe/calculateRecipe.ts';
import { defaultRecipeInput } from '../../lib/recipe/defaults.ts';
import { RecipeResultsView } from './RecipeResultsView.tsx';

const formula = calculateRecipe(defaultRecipeInput);

function render(): string {
  return renderToStaticMarkup(
    createElement(RecipeResultsView, {
      recipeInput: defaultRecipeInput,
      formula,
      assessmentSections: assessRecipe(defaultRecipeInput, formula),
      onEditStep: () => undefined,
      onBuildSchedule: () => undefined,
      onSave: () => undefined,
      isSavedRecipe: false,
    }),
  );
}

describe('RecipeResultsView', () => {
  const html = render();

  it('puts the four input groups in ONE card as rows, not a card per group', () => {
    expect(html).toMatch(/<section class="summary-groups card"/);
    expect(html).not.toMatch(/class="summary-group card"/);
    expect(html.match(/class="summary-group"/g)).toHaveLength(4);
  });

  it('makes each row one button whose name says what it edits and keeps the visible value', () => {
    expect(html).toContain('<span class="visually-hidden">Edit </span>Dough size');
    expect(html).toContain('summary-group__label');
    expect(html).toContain('Dough size');
    expect(html).toContain('Fermentation &amp; levain');
  });

  it('lists the levain as a flat section, not a tinted panel with a green bar', () => {
    expect(html).not.toContain('ingredient-group');
    expect(html).toContain('ingredient-section');
    expect(html).toContain('Added to the dough');
  });

  it('keeps the sticky footer actions', () => {
    expect(html).toContain('Save recipe');
    expect(html).toContain('Build schedule');
  });
});
