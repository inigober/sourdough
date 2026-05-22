import type { ReactNode } from 'react';

import type { InputWizardStep } from '../features/recipe-builder/recipeBuilderSteps.ts';
import { PageShell } from './PageShell.tsx';
import { SaveIcon } from './icons.tsx';
import { WizardIconButton } from './WizardIconButton.tsx';
import { WizardProgress } from './WizardProgress.tsx';

type StepLayoutProps = {
  currentStep: InputWizardStep;
  children: ReactNode;
  canGoBack: boolean;
  canContinue: boolean;
  continueLabel?: string;
  showSaveToSummary?: boolean;
  headerAction?: ReactNode;
  onBack: () => void;
  onContinue: () => void;
  onSaveToSummary?: () => void;
};

export function StepLayout({
  currentStep,
  children,
  canGoBack,
  canContinue,
  continueLabel = 'Continue',
  showSaveToSummary = false,
  headerAction,
  onBack,
  onContinue,
  onSaveToSummary,
}: StepLayoutProps) {
  return (
    <PageShell
      className="wizard-shell"
      topBar={
        <header className="wizard-shell__header">
          <div className="wizard-shell__header-bar">
            <WizardProgress currentStep={currentStep} />
            {headerAction ? <div className="wizard-shell__header-action">{headerAction}</div> : null}
          </div>
        </header>
      }
      footer={
        <nav className="page-shell__footer wizard-nav wizard-nav--icons" aria-label="Recipe builder navigation">
          {canGoBack ? (
            <WizardIconButton label="Previous step" direction="back" onClick={onBack} />
          ) : (
            <span className="wizard-nav__spacer" />
          )}
          {showSaveToSummary && onSaveToSummary ? (
            <button
              type="button"
              className="wizard-button wizard-button--primary wizard-nav__save"
              aria-label="Update ingredient list"
              onClick={onSaveToSummary}
            >
              <SaveIcon className="wizard-nav__save-icon" />
              Save
            </button>
          ) : (
            <span className="wizard-nav__spacer" />
          )}
          <WizardIconButton
            label={continueLabel}
            direction="forward"
            variant="primary"
            disabled={!canContinue}
            onClick={onContinue}
          />
        </nav>
      }
    >
      {children}
    </PageShell>
  );
}
