import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LoafAssessmentPicker } from '../../components/LoafAssessmentPicker.tsx';
import { NumberField } from '../../components/NumberField.tsx';
import { SectionHeading } from '../../components/SectionHeading.tsx';
import { SelectField } from '../../components/SelectField.tsx';
import { Toast } from '../../components/Toast.tsx';
import { defaultRecipeInput } from '../../lib/recipe/defaults.ts';
import { createFlourBlendEntry } from '../../lib/recipe/flourBlend.ts';
import { validateRecipeInput } from '../../lib/recipe/validation.ts';
import { INPUT_WIZARD_STEPS } from '../recipe-builder/recipeBuilderSteps.ts';
import { WizardInputSteps } from '../recipe-builder/WizardInputSteps.tsx';
import { FlourSection } from '../recipe-builder/FlourSection.tsx';
import { SavedRecipeCard } from '../saved-recipes/SavedRecipeCard.tsx';

const noop = () => {};

function countMatches(html: string, pattern: RegExp): number {
  return html.match(pattern)?.length ?? 0;
}

describe('screen structure', () => {
  it('gives every wizard step exactly one level-1 heading', () => {
    for (const step of INPUT_WIZARD_STEPS) {
      const html = renderToStaticMarkup(
        createElement(WizardInputSteps, {
          currentStep: step,
          recipeInput: defaultRecipeInput,
          validationIssues: validateRecipeInput(defaultRecipeInput),
          canGoBack: true,
          canContinue: true,
          isLastWizardStep: false,
          showReturnToSummary: false,
          onBack: noop,
          onContinue: noop,
          onNumberChange: noop,
          onFlourTypeChange: noop,
          onFlourPercentChange: noop,
          onFlourPercentStep: noop,
          onAddFlour: noop,
          onRemoveFlour: noop,
          onEditDoughWeight: noop,
          onLevainActivityChange: noop,
          onLevainTypeChange: noop,
          onLevainHydrationChange: noop,
          onLevainFlourChange: noop,
        }),
      );

      expect(countMatches(html, /<h2[^>]*aria-level="1"/g), step).toBe(1);
    }
  });

  it('keeps ordinary section headings at level 2', () => {
    const html = renderToStaticMarkup(createElement(SectionHeading, { title: 'Choose a plan' }));

    expect(html).toContain('<h2>Choose a plan</h2>');
    expect(html).not.toContain('aria-level');
  });
});

describe('form fields', () => {
  it('links an error to its number field and announces it', () => {
    const html = renderToStaticMarkup(
      createElement(NumberField, {
        label: 'Hydration',
        value: 150,
        onChange: noop,
        message: 'Hydration must be between 50 and 110.',
        status: 'error',
      }),
    );

    expect(html).toContain('aria-invalid="true"');
    expect(html).toMatch(/aria-describedby="([^"]+)"/);
    expect(html).toContain('role="alert"');
  });

  it('announces a warning politely, without marking the field invalid', () => {
    const html = renderToStaticMarkup(
      createElement(NumberField, {
        label: 'Hydration',
        value: 95,
        onChange: noop,
        message: 'Very wet dough.',
        status: 'warning',
      }),
    );

    expect(html).toContain('role="status"');
    expect(html).not.toContain('aria-invalid');
  });

  it('links an error to its select', () => {
    const html = renderToStaticMarkup(
      createElement(SelectField, {
        label: 'Levain activity',
        value: 'a',
        options: [{ label: 'A', value: 'a' }],
        onChange: noop,
        message: 'Pick an active levain.',
        status: 'error',
      }),
    );

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby=');
    expect(html).toContain('role="alert"');
  });

  it('names every control of a blended flour after the flour', () => {
    const recipeInput = {
      ...defaultRecipeInput,
      doughFlours: [createFlourBlendEntry('wheatType1050', 60), createFlourBlendEntry('ryeType1150', 40)],
    };
    const html = renderToStaticMarkup(
      createElement(FlourSection, {
        recipeInput,
        validationIssues: [],
        onFlourTypeChange: noop,
        onFlourPercentChange: noop,
        onFlourPercentStep: noop,
        onAddFlour: noop,
        onRemoveFlour: noop,
        onEditDoughWeight: noop,
      }),
    );

    expect(html).not.toContain('aria-label="Remove flour"');
    expect(countMatches(html, /aria-label="Remove [^"]+"/g)).toBe(2);
    expect(countMatches(html, /aria-label="Decrease [^"]+ percentage"/g)).toBe(2);
    expect(countMatches(html, /aria-label="Increase [^"]+ percentage"/g)).toBe(2);
  });
});

describe('toast', () => {
  it('starts with an empty live region and a visible, screen-reader-hidden copy of the message', () => {
    const html = renderToStaticMarkup(
      createElement(Toast, { message: 'Finished “Mix”.', actionLabel: 'Undo', onAction: noop }),
    );

    expect(html).toMatch(/<span class="visually-hidden" role="status" aria-live="polite"><\/span>/);
    expect(html).toContain('<span aria-hidden="true">Finished “Mix”.</span>');
    expect(html).toContain('>Undo</button>');
  });
});

describe('lists and pickers', () => {
  it('gives each saved recipe button the recipe name', () => {
    const html = renderToStaticMarkup(
      createElement(SavedRecipeCard, {
        recipe: {
          id: '1',
          name: 'Country loaf',
          breadStyle: 'country',
          scheduleLabel: 'Mix on bake day −1',
          hasSchedule: true,
          savedAt: '2026-11-01T10:00:00.000Z',
          updatedAt: '2026-11-01T10:00:00.000Z',
        },
        bakeStats: undefined,
        onOpen: noop,
        onStartBake: noop,
        onDuplicate: noop,
      }),
    );

    expect(html).toContain('aria-label="Start baking Country loaf"');
    expect(html).toContain('aria-label="Duplicate Country loaf"');
  });

  it('exposes the loaf assessment as a labelled group of toggle buttons', () => {
    const html = renderToStaticMarkup(
      createElement(LoafAssessmentPicker, { value: 'ok', onChange: noop }),
    );

    expect(html).toContain('role="group" aria-label="Loaf assessment"');
    expect(countMatches(html, /aria-pressed="true"/g)).toBe(1);
    expect(countMatches(html, /aria-pressed="false"/g)).toBe(2);
  });
});
