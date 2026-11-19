import type { ReactNode } from 'react';

import type { InputWizardStep } from '../features/recipe-builder/recipeBuilderSteps.ts';
import { PageShell } from './PageShell.tsx';
import { ArrowLeftIcon, ArrowRightIcon, SaveIcon } from './icons.tsx';
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
        <nav className="page-shell__footer wizard-nav wizard-nav--steps" aria-label="Recipe builder navigation">
          {canGoBack ? (
            <button
              type="button"
              className="wizard-button wizard-button--secondary wizard-button--with-icon"
              onClick={onBack}
            >
              <ArrowLeftIcon />
              Back
            </button>
          ) : (
            <span className="wizard-nav__spacer" />
          )}
          {showSaveToSummary && onSaveToSummary ? (
            <button
              type="button"
              className="wizard-button wizard-button--primary wizard-nav__save"
              aria-label="Save and return to summary"
              onClick={onSaveToSummary}
            >
              <SaveIcon className="wizard-nav__save-icon" />
              Save
            </button>
          ) : (
            <span className="wizard-nav__spacer" />
          )}
          <button
            type="button"
            className="wizard-button wizard-button--primary wizard-button--with-icon"
            disabled={!canContinue}
            onClick={onContinue}
          >
            {continueLabel}
            <ArrowRightIcon />
          </button>
        </nav>
      }
    >
      {children}
    </PageShell>
  );
}
