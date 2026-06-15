import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { StepLayout } from '../../components/StepLayout.tsx';

describe('StepLayout', () => {
  it('disables Continue when canContinue is false', () => {
    const html = renderToStaticMarkup(
      createElement(StepLayout, {
        currentStep: 'doughSize',
        canGoBack: true,
        canContinue: false,
        onBack: () => {},
        onContinue: () => {},
        children: 'Step content',
      }),
    );

    expect(html).toMatch(/aria-label="Continue"[^>]*disabled/);
  });

  it('enables Continue when canContinue is true', () => {
    const html = renderToStaticMarkup(
      createElement(StepLayout, {
        currentStep: 'doughSize',
        canGoBack: true,
        canContinue: true,
        onBack: () => {},
        onContinue: () => {},
        children: 'Step content',
      }),
    );

    const continueButton = html.match(/<button[^>]*aria-label="Continue"[^>]*>/)?.[0] ?? '';
    expect(continueButton).not.toMatch(/disabled/);
  });
});
