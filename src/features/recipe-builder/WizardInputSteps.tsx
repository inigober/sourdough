import type { ReactNode } from 'react';

import type { RecipeValidationIssue, RecipeInput } from '../../lib/recipe/types.ts';
import { StepLayout } from '../../components/StepLayout.tsx';
import { DoughSizeSection } from './DoughSizeSection.tsx';
import { FermentationSection } from './FermentationSection.tsx';
import { FlourSection } from './FlourSection.tsx';
import { RecipeTargetsSection } from './RecipeTargetsSection.tsx';
import type { WizardNumberField } from './useRecipeWizard.ts';
import type { InputWizardStep } from './recipeBuilderSteps.ts';

type WizardInputStepsProps = {
  currentStep: InputWizardStep;
  recipeInput: RecipeInput;
  validationIssues: RecipeValidationIssue[];
  canGoBack: boolean;
  canContinue: boolean;
  isLastWizardStep: boolean;
  showReturnToSummary: boolean;
  headerAction?: ReactNode;
  onBack: () => void;
  onContinue: () => void;
  onReturnToSummary?: () => void;
  onNumberChange: (field: WizardNumberField, value: number) => void;
  onFlourTypeChange: (entryId: string, flourType: RecipeInput['doughFlours'][number]['flourType']) => void;
  onFlourPercentChange: (entryId: string, percent: number) => void;
  onFlourPercentStep: (entryId: string, delta: number) => void;
  onAddFlour: () => void;
  onRemoveFlour: (entryId: string) => void;
  onEditDoughWeight: () => void;
  onLevainActivityChange: (activity: RecipeInput['levainActivity']) => void;
  onLevainTypeChange: (type: RecipeInput['levainType']) => void;
  onLevainHydrationChange: (value: number) => void;
  onLevainFlourChange: (flourType: RecipeInput['levainFlourType']) => void;
  children?: ReactNode;
};

export function WizardInputSteps({
  currentStep,
  recipeInput,
  validationIssues,
  canGoBack,
  canContinue,
  isLastWizardStep,
  showReturnToSummary,
  headerAction,
  onBack,
  onContinue,
  onReturnToSummary,
  onNumberChange,
  onFlourTypeChange,
  onFlourPercentChange,
  onFlourPercentStep,
  onAddFlour,
  onRemoveFlour,
  onEditDoughWeight,
  onLevainActivityChange,
  onLevainTypeChange,
  onLevainHydrationChange,
  onLevainFlourChange,
  children,
}: WizardInputStepsProps) {
  return (
    <>
      <StepLayout
        currentStep={currentStep}
        canGoBack={canGoBack}
        canContinue={canContinue}
        continueLabel={isLastWizardStep ? 'View ingredient summary' : 'Continue'}
        showSaveToSummary={showReturnToSummary}
        headerAction={headerAction}
        onBack={onBack}
        onContinue={onContinue}
        onSaveToSummary={showReturnToSummary ? onReturnToSummary : undefined}
      >
        {currentStep === 'doughSize' ? (
          <DoughSizeSection
            recipeInput={recipeInput}
            validationIssues={validationIssues}
            onNumberChange={onNumberChange}
          />
        ) : null}
        {currentStep === 'flour' ? (
          <FlourSection
            recipeInput={recipeInput}
            validationIssues={validationIssues}
            onFlourTypeChange={onFlourTypeChange}
            onFlourPercentChange={onFlourPercentChange}
            onFlourPercentStep={onFlourPercentStep}
            onAddFlour={onAddFlour}
            onRemoveFlour={onRemoveFlour}
            onEditDoughWeight={onEditDoughWeight}
          />
        ) : null}
        {currentStep === 'recipeTargets' ? (
          <RecipeTargetsSection
            recipeInput={recipeInput}
            validationIssues={validationIssues}
            onNumberChange={onNumberChange}
          />
        ) : null}
        {currentStep === 'fermentation' ? (
          <FermentationSection
            recipeInput={recipeInput}
            validationIssues={validationIssues}
            onNumberChange={onNumberChange}
            onLevainActivityChange={onLevainActivityChange}
            onLevainTypeChange={onLevainTypeChange}
            onLevainHydrationChange={onLevainHydrationChange}
            onLevainFlourChange={onLevainFlourChange}
          />
        ) : null}
      </StepLayout>
      {children}
    </>
  );
}
