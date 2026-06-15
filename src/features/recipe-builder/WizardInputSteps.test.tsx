import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { defaultRecipeInput } from '../../lib/recipe/defaults.ts';
import type { RecipeInput } from '../../lib/recipe/types.ts';
import { validateRecipeInput } from '../../lib/recipe/validation.ts';
import { getWizardContinueEnabled, type InputWizardStep } from './recipeBuilderSteps.ts';
import { WizardInputSteps } from './WizardInputSteps.tsx';

const noop = () => {};

function getContinueButtonMarkup(html: string): string {
  return html.match(/<button[^>]*aria-label="(?:Continue|View ingredient summary)"[^>]*>/)?.[0] ?? '';
}

function renderWizard(options: {
  currentStep: InputWizardStep;
  recipeInput?: RecipeInput;
  showReturnToSummary?: boolean;
}): string {
  const recipeInput = options.recipeInput ?? defaultRecipeInput;
  const validationIssues = validateRecipeInput(recipeInput);
  const canContinue = getWizardContinueEnabled(validationIssues, options.currentStep);
  const showReturnToSummary = options.showReturnToSummary ?? false;

  return renderToStaticMarkup(
    createElement(WizardInputSteps, {
      currentStep: options.currentStep,
      recipeInput,
      validationIssues,
      canGoBack: options.currentStep !== 'doughSize',
      canContinue,
      isLastWizardStep: options.currentStep === 'fermentation',
      showReturnToSummary,
      onBack: noop,
      onContinue: noop,
      onReturnToSummary: showReturnToSummary ? noop : undefined,
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
}

describe('WizardInputSteps integration', () => {
  it('renders the dough size step with Continue enabled for valid defaults', () => {
    const html = renderWizard({ currentStep: 'doughSize' });

    expect(html).toContain('How much dough are you making?');
    expect(getContinueButtonMarkup(html)).not.toMatch(/disabled/);
  });

  it('disables Continue on dough size when weight is invalid', () => {
    const html = renderWizard({
      currentStep: 'doughSize',
      recipeInput: { ...defaultRecipeInput, finalDoughWeightGrams: 0 },
    });

    expect(getContinueButtonMarkup(html)).toMatch(/disabled/);
  });

  it('renders the flour step and blocks Continue when the blend is uneven', () => {
    const unevenBlend: RecipeInput = {
      ...defaultRecipeInput,
      doughFlours: [
        { ...defaultRecipeInput.doughFlours[0], id: 'a', percent: 60 },
        { ...defaultRecipeInput.doughFlours[0], id: 'b', percent: 30 },
      ],
    };
    const html = renderWizard({ currentStep: 'flour', recipeInput: unevenBlend });

    expect(html).toContain('60% Wheat Type 1050 + 30% Wheat Type 1050');
    expect(getContinueButtonMarkup(html)).toMatch(/disabled/);
  });

  it('renders recipe targets and blocks Continue only on that step for invalid hydration', () => {
    const invalidHydration = { ...defaultRecipeInput, hydrationPercent: 0 };

    const doughHtml = renderWizard({ currentStep: 'doughSize', recipeInput: invalidHydration });
    const targetsHtml = renderWizard({ currentStep: 'recipeTargets', recipeInput: invalidHydration });

    expect(doughHtml).toContain('How much dough are you making?');
    expect(getContinueButtonMarkup(doughHtml)).not.toMatch(/disabled/);

    expect(targetsHtml).toContain('0% hydration, 2% salt');
    expect(getContinueButtonMarkup(targetsHtml)).toMatch(/disabled/);
  });

  it('uses the summary label on the last wizard step', () => {
    const html = renderWizard({ currentStep: 'fermentation' });

    expect(html).toContain('Timing and starter strength');
    expect(html).toMatch(/aria-label="View ingredient summary"/);
  });

  it('shows Save to summary when editing from results', () => {
    const html = renderWizard({
      currentStep: 'flour',
      showReturnToSummary: true,
    });

    expect(html).toMatch(/aria-label="Update ingredient list"/);
  });
});
