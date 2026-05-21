import { useMemo, useState } from 'react';

import { StepLayout } from '../../components/StepLayout.tsx';
import { assessRecipe } from '../../lib/recipe/assessRecipe.ts';
import { calculateRecipe } from '../../lib/recipe/calculateRecipe.ts';
import { defaultRecipeInput, getLevainHydrationForType } from '../../lib/recipe/defaults.ts';
import {
  addFlourEntry,
  getPrimaryFlourType,
  removeFlourEntry,
  stepFlourGrams,
  updateFlourGrams as setFlourGramsInBlend,
  updateFlourPercent as setFlourPercentInBlend,
  updateFlourType as setFlourTypeInBlend,
} from '../../lib/recipe/flourBlend.ts';
import { hasBlockingValidationIssue, validateRecipeInput } from '../../lib/recipe/validation.ts';
import type {
  FlourType,
  LevainActivity,
  LevainType,
  RecipeInput,
} from '../../lib/recipe/types.ts';
import { createDefaultScheduleInput } from '../../lib/schedule/defaults.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import { ScheduleBuilderView } from '../schedule-builder/ScheduleBuilderView.tsx';
import { DoughSizeSection } from './DoughSizeSection.tsx';
import type { DoughSizeNumberField } from './DoughSizeSection.tsx';
import { FermentationSection } from './FermentationSection.tsx';
import type { FermentationNumberField } from './FermentationSection.tsx';
import { FlourSection } from './FlourSection.tsx';
import { RecipeResultsView } from './RecipeResultsView.tsx';
import { RecipeTargetsSection } from './RecipeTargetsSection.tsx';
import type { RecipeTargetsNumberField } from './RecipeTargetsSection.tsx';
import {
  getNextStep,
  getPreviousStep,
  hasBlockingIssuesForStep,
  type RecipeBuilderStep,
} from './recipeBuilderSteps.ts';
import { WelcomeStep } from './steps/WelcomeStep.tsx';

type BuilderPhase = 'wizard' | 'results' | 'schedule';

type NumberFieldName = DoughSizeNumberField | RecipeTargetsNumberField | FermentationNumberField;

export function RecipeBuilder() {
  const [phase, setPhase] = useState<BuilderPhase>('wizard');
  const [currentStep, setCurrentStep] = useState<RecipeBuilderStep>('welcome');
  const [hasCompletedWizard, setHasCompletedWizard] = useState(false);
  const [editingFromResults, setEditingFromResults] = useState(false);
  const [recipeInput, setRecipeInput] = useState<RecipeInput>(defaultRecipeInput);
  const [scheduleInput, setScheduleInput] = useState<ScheduleInput>(() =>
    createDefaultScheduleInput(defaultRecipeInput),
  );

  const validationIssues = useMemo(() => validateRecipeInput(recipeInput), [recipeInput]);
  const hasBlockingIssues = hasBlockingValidationIssue(validationIssues);
  const formula = useMemo(
    () => (hasBlockingIssues ? null : calculateRecipe(recipeInput)),
    [hasBlockingIssues, recipeInput],
  );
  const assessmentSections = useMemo(
    () => (formula ? assessRecipe(recipeInput, formula) : []),
    [formula, recipeInput],
  );

  function goToStep(step: RecipeBuilderStep): void {
    setPhase('wizard');
    setCurrentStep(step);
    setEditingFromResults(false);
  }

  function goToStepFromResults(step: RecipeBuilderStep): void {
    setPhase('wizard');
    setCurrentStep(step);
    setEditingFromResults(true);
  }

  function returnToSummary(): void {
    setPhase('results');
    setEditingFromResults(false);
  }

  function openScheduleBuilder(): void {
    setScheduleInput(createDefaultScheduleInput(recipeInput));
    setPhase('schedule');
  }

  function updateSchedule(patch: Partial<ScheduleInput>): void {
    setScheduleInput((current) => ({ ...current, ...patch }));
  }

  if (phase === 'schedule') {
    return (
      <ScheduleBuilderView
        recipeInput={recipeInput}
        scheduleInput={scheduleInput}
        onScheduleChange={updateSchedule}
        onBack={() => setPhase('results')}
      />
    );
  }

  if (phase === 'results') {
    return (
      <RecipeResultsView
        recipeInput={recipeInput}
        formula={formula}
        assessmentSections={assessmentSections}
        onEditStep={goToStepFromResults}
        onBuildSchedule={openScheduleBuilder}
      />
    );
  }

  if (currentStep === 'welcome') {
    return <WelcomeStep onStart={() => setCurrentStep('doughSize')} />;
  }

  const canGoBack = getPreviousStep(currentStep) !== null;
  const canContinue = !hasBlockingIssuesForStep(validationIssues, currentStep);
  const isLastWizardStep = currentStep === 'fermentation';
  const showReturnToSummary = hasCompletedWizard && editingFromResults;

  function goBack(): void {
    const previousStep = getPreviousStep(currentStep);
    if (previousStep) {
      setCurrentStep(previousStep);
    }
  }

  function goContinue(): void {
    if (isLastWizardStep) {
      setHasCompletedWizard(true);
      setEditingFromResults(false);
      setPhase('results');
      return;
    }

    const nextStep = getNextStep(currentStep);
    if (nextStep) {
      setCurrentStep(nextStep);
    }
  }

  function updateNumberField(field: NumberFieldName, value: number): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      [field]: value,
    }));
  }

  function updateFlourType(entryId: string, flourType: FlourType): void {
    setRecipeInput((currentInput) => {
      const nextFlours = setFlourTypeInBlend(currentInput.doughFlours, entryId, flourType);
      const primaryFlour = getPrimaryFlourType(nextFlours);

      return {
        ...currentInput,
        doughFlours: nextFlours,
        levainFlourType:
          currentInput.levainFlourType === getPrimaryFlourType(currentInput.doughFlours)
            ? primaryFlour
            : currentInput.levainFlourType,
      };
    });
  }

  function updateFlourPercent(entryId: string, percent: number): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      doughFlours: setFlourPercentInBlend(currentInput.doughFlours, entryId, percent),
    }));
  }

  function updateFlourGrams(entryId: string, grams: number, totalFlourGrams: number): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      doughFlours: setFlourGramsInBlend(currentInput.doughFlours, entryId, grams, totalFlourGrams),
    }));
  }

  function updateFlourGramsStep(entryId: string, delta: number, totalFlourGrams: number): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      doughFlours: stepFlourGrams(currentInput.doughFlours, entryId, delta, totalFlourGrams),
    }));
  }

  function handleAddFlour(): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      doughFlours: addFlourEntry(currentInput.doughFlours),
    }));
  }

  function handleRemoveFlour(entryId: string): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      doughFlours: removeFlourEntry(currentInput.doughFlours, entryId),
    }));
  }

  function updateLevainFlourType(flourType: FlourType): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      levainFlourType: flourType,
    }));
  }

  function updateLevainType(levainType: LevainType): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      levainType,
      levainHydrationPercent: getLevainHydrationForType(levainType, currentInput.levainHydrationPercent),
    }));
  }

  function updateLevainActivity(levainActivity: LevainActivity): void {
    setRecipeInput((currentInput) => ({
      ...currentInput,
      levainActivity,
    }));
  }

  function updateLevainHydration(value: number): void {
    updateNumberField('levainHydrationPercent', value);
  }

  return (
    <StepLayout
      currentStep={currentStep}
      canGoBack={canGoBack}
      canContinue={canContinue}
      continueLabel={isLastWizardStep ? 'View ingredient summary' : 'Continue'}
      returnToSummaryLabel={showReturnToSummary ? 'Back to ingredient summary' : undefined}
      onBack={goBack}
      onContinue={goContinue}
      onReturnToSummary={showReturnToSummary ? returnToSummary : undefined}
    >
      {currentStep === 'doughSize' ? (
        <DoughSizeSection
          recipeInput={recipeInput}
          validationIssues={validationIssues}
          onNumberChange={updateNumberField}
        />
      ) : null}
      {currentStep === 'flour' ? (
        <FlourSection
          recipeInput={recipeInput}
          validationIssues={validationIssues}
          onFlourTypeChange={updateFlourType}
          onFlourPercentChange={updateFlourPercent}
          onFlourGramsChange={updateFlourGrams}
          onFlourGramsStep={updateFlourGramsStep}
          onAddFlour={handleAddFlour}
          onRemoveFlour={handleRemoveFlour}
          onEditDoughWeight={() => goToStep('doughSize')}
        />
      ) : null}
      {currentStep === 'recipeTargets' ? (
        <RecipeTargetsSection
          recipeInput={recipeInput}
          validationIssues={validationIssues}
          onNumberChange={updateNumberField}
        />
      ) : null}
      {currentStep === 'fermentation' ? (
        <FermentationSection
          recipeInput={recipeInput}
          validationIssues={validationIssues}
          onNumberChange={updateNumberField}
          onLevainActivityChange={updateLevainActivity}
          onLevainTypeChange={updateLevainType}
          onLevainHydrationChange={updateLevainHydration}
          onLevainFlourChange={updateLevainFlourType}
        />
      ) : null}
    </StepLayout>
  );
}
