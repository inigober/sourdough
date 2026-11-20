import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { assessRecipe } from '../../lib/recipe/assessRecipe.ts';
import { calculateRecipe } from '../../lib/recipe/calculateRecipe.ts';
import { defaultRecipeInput } from '../../lib/recipe/defaults.ts';
import { RecipeAssessment } from '../../components/RecipeAssessment.tsx';

const sections = assessRecipe(defaultRecipeInput, calculateRecipe(defaultRecipeInput));

function render(options: { defaultOpen?: boolean; isUnavailable?: boolean } = {}): string {
  return renderToStaticMarkup(
    createElement(RecipeAssessment, {
      sections,
      isUnavailable: options.isUnavailable ?? false,
      defaultOpen: options.defaultOpen,
    }),
  );
}

describe('RecipeAssessment', () => {
  it('is collapsed by default: the verdict is visible, the details are not rendered', () => {
    const html = render();

    expect(html).toContain('assessment-verdict');
    expect(html).toContain(sections[0].shortMessage.replace(/&/g, '&amp;'));
    expect(html).toMatch(/aria-expanded="false"/);
    expect(html).toContain('Show details');
    expect(html).not.toContain('assessment-details');
    expect(html).not.toContain('dough signs');
  });

  it('names the level in words next to the icon, not by colour alone', () => {
    expect(render()).toMatch(/assessment-verdict__level">(Looks good|Note|Worth a look|Needs care)</);
  });

  it('opens to the full notes, including the dough-signs reminder', () => {
    const html = render({ defaultOpen: true });

    expect(html).toMatch(/aria-expanded="true"/);
    expect(html).toContain('Hide details');
    expect(html).toContain('dough signs');
    expect(html).toContain('Target dough rise');
  });

  it('links the toggle to the details panel', () => {
    const html = render({ defaultOpen: true });
    const controls = html.match(/aria-controls="([^"]+)"/)?.[1];

    expect(controls).toBeTruthy();
    expect(html).toContain(`id="${controls}"`);
  });

  it('explains when the recipe cannot be assessed', () => {
    const html = render({ isUnavailable: true });

    expect(html).toContain('Fix the blocking input errors');
    expect(html).not.toContain('assessment-toggle');
  });
});
