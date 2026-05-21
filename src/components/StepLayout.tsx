import type { ReactNode } from 'react';

import type { InputWizardStep } from '../features/recipe-builder/recipeBuilderSteps.ts';
import { WizardProgress } from './WizardProgress.tsx';

type StepLayoutProps = {
  currentStep: InputWizardStep;
  children: ReactNode;
  canGoBack: boolean;
  canContinue: boolean;
  continueLabel?: string;
  returnToSummaryLabel?: string;
  onBack: () => void;
  onContinue: () => void;
  onReturnToSummary?: () => void;
};

export function StepLayout({
  currentStep,
  children,
  canGoBack,
  canContinue,
  continueLabel = 'Continue',
  returnToSummaryLabel,
  onBack,
  onContinue,
  onReturnToSummary,
}: StepLayoutProps) {
  return (
    <div className="wizard-shell">
      <header className="wizard-shell__header">
        <WizardProgress currentStep={currentStep} />
        {returnToSummaryLabel && onReturnToSummary ? (
          <button type="button" className="return-to-summary" onClick={onReturnToSummary}>
            ← {returnToSummaryLabel}
          </button>
        ) : null}
      </header>

      <div className="wizard-shell__content">{children}</div>

      <nav className="wizard-shell__footer wizard-nav" aria-label="Recipe builder navigation">
        {canGoBack ? (
          <button type="button" className="wizard-button wizard-button--secondary" onClick={onBack}>
            Back
          </button>
        ) : (
          <span />
        )}
        {continueLabel ? (
          <button
            type="button"
            className="wizard-button wizard-button--primary"
            onClick={onContinue}
            disabled={!canContinue}
          >
            {continueLabel}
          </button>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
