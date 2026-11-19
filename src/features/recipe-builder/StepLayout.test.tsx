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

    expect(html).toMatch(/<button[^>]*disabled[^>]*>Continue/);
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

    const continueButton = html.match(/<button[^>]*>(?=Continue)/)?.[0] ?? '';
    expect(continueButton).not.toBe('');
    expect(continueButton).not.toMatch(/disabled/);
  });

  it('shows labelled Back and Continue buttons, not icon-only circles', () => {
    const html = renderToStaticMarkup(
      createElement(StepLayout, {
        currentStep: 'flour',
        canGoBack: true,
        canContinue: true,
        onBack: () => {},
        onContinue: () => {},
        children: 'Step content',
      }),
    );

    expect(html).toMatch(/<button[^>]*>(?:<svg[^>]*>.*?<\/svg>)Back<\/button>/);
    expect(html).toMatch(/<button[^>]*>Continue<svg/);
    expect(html).not.toMatch(/<button[^>]*aria-label="(?:Previous step|Continue)"/);
  });

  it('uses the custom continue label as visible text on the last step', () => {
    const html = renderToStaticMarkup(
      createElement(StepLayout, {
        currentStep: 'fermentation',
        canGoBack: true,
        canContinue: true,
        continueLabel: 'View summary',
        onBack: () => {},
        onContinue: () => {},
        children: 'Step content',
      }),
    );

    expect(html).toMatch(/<button[^>]*>View summary<svg/);
  });
});
