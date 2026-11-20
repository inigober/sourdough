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
  const hasSave = showSaveToSummary && Boolean(onSaveToSummary);

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
        <nav className={getNavClassName(canGoBack, hasSave)} aria-label="Recipe builder navigation">
          {canGoBack ? (
            <button
              type="button"
              className="wizard-button wizard-button--secondary wizard-button--with-icon wizard-nav__back"
              onClick={onBack}
            >
              <ArrowLeftIcon />
              Back
            </button>
          ) : null}
          {hasSave ? (
            <button
              type="button"
              className="wizard-button wizard-button--primary wizard-button--with-icon wizard-nav__save"
              aria-label="Save and return to summary"
              onClick={onSaveToSummary}
            >
              <SaveIcon />
              Save
            </button>
          ) : null}
          {/* One primary action per bar: when Save is there, Continue is the secondary one. */}
          <button
            type="button"
            className={
              hasSave
                ? 'wizard-button wizard-button--secondary wizard-button--with-icon wizard-nav__continue'
                : 'wizard-button wizard-button--primary wizard-button--with-icon wizard-nav__continue'
            }
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

function getNavClassName(hasBack: boolean, hasSave: boolean): string {
  return [
    'page-shell__footer',
    'wizard-nav',
    'wizard-nav--steps',
    hasBack ? 'wizard-nav--has-back' : 'wizard-nav--no-back',
    hasSave ? 'wizard-nav--has-save' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
