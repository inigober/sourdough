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

  it('in edit mode shows Back, Save and Continue in one row group with Save as the only primary', () => {
    const html = renderToStaticMarkup(
      createElement(StepLayout, {
        currentStep: 'flour',
        canGoBack: true,
        canContinue: true,
        showSaveToSummary: true,
        onBack: () => {},
        onContinue: () => {},
        onSaveToSummary: () => {},
        children: 'Step content',
      }),
    );
    const nav = html.match(/<nav[^>]*>.*<\/nav>/)?.[0] ?? '';
    const buttons = [...nav.matchAll(/<button[^>]*class="([^"]*)"/g)].map((match) => match[1]);

    expect(nav).toContain('wizard-nav--has-save');
    expect(buttons).toHaveLength(3);
    expect(buttons.filter((className) => className.includes('button--primary'))).toHaveLength(1);
    expect(buttons[1]).toContain('wizard-nav__save');
    expect(buttons[1]).toContain('button--primary');
    expect(buttons[0]).toContain('button--secondary');
    expect(buttons[2]).toContain('button--secondary');
  });

  it('on the first step there is no Back button and no empty spacer', () => {
    const html = renderToStaticMarkup(
      createElement(StepLayout, {
        currentStep: 'doughSize',
        canGoBack: false,
        canContinue: true,
        onBack: () => {},
        onContinue: () => {},
        children: 'Step content',
      }),
    );

    expect(html).toContain('wizard-nav--no-back');
    expect(html).not.toMatch(/>Back</);
    expect(html).not.toContain('wizard-nav__spacer');
  });
});
