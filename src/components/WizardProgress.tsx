import { INPUT_WIZARD_STEPS, WIZARD_STEP_LABELS, type InputWizardStep } from '../features/recipe-builder/recipeBuilderSteps.ts';

type WizardProgressProps = {
  currentStep: InputWizardStep;
};

export function WizardProgress({ currentStep }: WizardProgressProps) {
  const currentIndex = INPUT_WIZARD_STEPS.indexOf(currentStep);
  const totalSteps = INPUT_WIZARD_STEPS.length;

  return (
    <div className="wizard-progress-bar" aria-live="polite">
      <div
        className="wizard-progress-bar__track"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={currentIndex + 1}
        aria-label={`Step ${currentIndex + 1} of ${totalSteps}: ${WIZARD_STEP_LABELS[currentStep]}`}
      >
        {INPUT_WIZARD_STEPS.map((step, index) => (
          <span
            key={step}
            className={
              index <= currentIndex
                ? 'wizard-progress-bar__segment wizard-progress-bar__segment--filled'
                : 'wizard-progress-bar__segment'
            }
          />
        ))}
      </div>
      <div className="wizard-progress-bar__meta">
        <span className="wizard-progress-bar__meta-line">
          <span className="wizard-progress-bar__count">
            {currentIndex + 1} of {totalSteps}
          </span>
          <span className="wizard-progress-bar__separator" aria-hidden="true">
            ·
          </span>
          <span className="wizard-progress-bar__label">{WIZARD_STEP_LABELS[currentStep]}</span>
        </span>
      </div>
    </div>
  );
}
