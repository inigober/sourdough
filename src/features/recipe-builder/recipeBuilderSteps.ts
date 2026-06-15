import type { RecipeInput, RecipeValidationIssue } from '../../lib/recipe/types.ts';

export const INPUT_WIZARD_STEPS = [
  'doughSize',
  'flour',
  'recipeTargets',
  'fermentation',
] as const;

export type InputWizardStep = (typeof INPUT_WIZARD_STEPS)[number];

export const RECIPE_BUILDER_STEPS = ['welcome', ...INPUT_WIZARD_STEPS] as const;

export type RecipeBuilderStep = (typeof RECIPE_BUILDER_STEPS)[number];

export const WIZARD_STEP_LABELS: Record<InputWizardStep, string> = {
  doughSize: 'Dough size',
  flour: 'Flour blend',
  recipeTargets: 'Hydration & salt',
  fermentation: 'Fermentation & levain',
};

export function isInputWizardStep(step: RecipeBuilderStep): step is InputWizardStep {
  return INPUT_WIZARD_STEPS.includes(step as InputWizardStep);
}

const STEP_INPUT_FIELDS: Record<RecipeBuilderStep, readonly (keyof RecipeInput | 'doughFlours')[]> = {
  welcome: [],
  doughSize: ['finalDoughWeightGrams', 'numberOfLoaves'],
  flour: ['doughFlours'],
  recipeTargets: ['hydrationPercent', 'saltPercent'],
  fermentation: [
    'targetBulkHours',
    'roomTemperatureCelsius',
    'levainActivity',
    'levainType',
    'levainHydrationPercent',
    'levainFlourType',
  ],
};

export function getStepIndex(step: RecipeBuilderStep): number {
  return RECIPE_BUILDER_STEPS.indexOf(step);
}

export function getPreviousStep(step: RecipeBuilderStep): RecipeBuilderStep | null {
  const index = getStepIndex(step);
  return index > 0 ? RECIPE_BUILDER_STEPS[index - 1] : null;
}

export function getNextStep(step: RecipeBuilderStep): RecipeBuilderStep | null {
  const index = getStepIndex(step);
  return index < RECIPE_BUILDER_STEPS.length - 1 ? RECIPE_BUILDER_STEPS[index + 1] : null;
}

export function hasBlockingIssuesForStep(
  issues: RecipeValidationIssue[],
  step: RecipeBuilderStep,
): boolean {
  const fields = STEP_INPUT_FIELDS[step];
  if (fields.length === 0) {
    return false;
  }

  return issues.some(
    (issue) => issue.level === 'error' && fields.includes(issue.field as keyof RecipeInput | 'doughFlours'),
  );
}

export function getWizardContinueEnabled(
  issues: RecipeValidationIssue[],
  step: RecipeBuilderStep,
): boolean {
  return !hasBlockingIssuesForStep(issues, step);
}
