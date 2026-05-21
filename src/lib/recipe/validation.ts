import { getFlourBlendTotalPercent } from './flourBlend.ts';
import type { RecipeInput, RecipeValidationIssue } from './types.ts';

export function validateRecipeInput(input: RecipeInput): RecipeValidationIssue[] {
  const issues: RecipeValidationIssue[] = [];

  addNumberErrorIfNeeded(issues, input.finalDoughWeightGrams, 'finalDoughWeightGrams', 'Final dough weight must be a number.');
  addNumberErrorIfNeeded(issues, input.numberOfLoaves, 'numberOfLoaves', 'Number of loaves must be a number.');
  addNumberErrorIfNeeded(issues, input.hydrationPercent, 'hydrationPercent', 'Hydration must be a number.');
  addNumberErrorIfNeeded(issues, input.saltPercent, 'saltPercent', 'Salt must be a number.');
  addNumberErrorIfNeeded(issues, input.levainHydrationPercent, 'levainHydrationPercent', 'Levain hydration must be a number.');
  addNumberErrorIfNeeded(issues, input.targetBulkHours, 'targetBulkHours', 'Target bulk fermentation must be a number.');
  addNumberErrorIfNeeded(issues, input.roomTemperatureCelsius, 'roomTemperatureCelsius', 'Room temperature must be a number.');

  if (hasBlockingValidationIssue(issues)) {
    return issues;
  }

  addErrorIf(issues, input.finalDoughWeightGrams <= 0, 'finalDoughWeightGrams', 'Final dough weight must be above 0g.');
  addErrorIf(issues, input.numberOfLoaves < 1, 'numberOfLoaves', 'Number of loaves must be at least 1.');
  addErrorIf(issues, input.hydrationPercent < 50 || input.hydrationPercent > 110, 'hydrationPercent', 'Hydration must be between 50% and 110%.');
  addErrorIf(issues, input.saltPercent < 0 || input.saltPercent > 4, 'saltPercent', 'Salt must be between 0% and 4%.');
  addErrorIf(issues, input.levainHydrationPercent < 40 || input.levainHydrationPercent > 200, 'levainHydrationPercent', 'Levain hydration must be between 40% and 200%.');
  addErrorIf(issues, input.targetBulkHours < 2 || input.targetBulkHours > 12, 'targetBulkHours', 'Target bulk fermentation must be between 2 and 12 hours.');
  addErrorIf(issues, input.roomTemperatureCelsius < 16 || input.roomTemperatureCelsius > 32, 'roomTemperatureCelsius', 'Room temperature must be between 16C and 32C.');

  const flourBlendTotalPercent = getFlourBlendTotalPercent(input.doughFlours);
  addErrorIf(issues, input.doughFlours.length === 0, 'doughFlours', 'Add at least one flour to the dough.');
  addErrorIf(
    issues,
    input.doughFlours.some((entry) => entry.percent <= 0),
    'doughFlours',
    'Each flour share must be above 0%.',
  );
  addErrorIf(
    issues,
    Math.abs(flourBlendTotalPercent - 100) > 0.5,
    'doughFlours',
    'Flour percentages must add up to 100%.',
  );

  addWarningIf(issues, input.saltPercent < 1.8 || input.saltPercent > 2.2, 'saltPercent', 'Salt is outside the usual 1.8-2.2% wheat sourdough range.');
  addWarningIf(issues, input.levainActivity !== 'active' && input.levainActivity !== 'veryActive', 'levainActivity', 'Levain activity may make fermentation timing less reliable.');

  return issues;
}

function addNumberErrorIfNeeded(
  issues: RecipeValidationIssue[],
  value: number,
  field: RecipeValidationIssue['field'],
  message: string,
): void {
  addErrorIf(issues, !Number.isFinite(value), field, message);
}

export function hasBlockingValidationIssue(issues: RecipeValidationIssue[]): boolean {
  return issues.some((issue) => issue.level === 'error');
}

function addErrorIf(
  issues: RecipeValidationIssue[],
  condition: boolean,
  field: RecipeValidationIssue['field'],
  message: string,
): void {
  if (condition) {
    issues.push({ field, level: 'error', message });
  }
}

function addWarningIf(
  issues: RecipeValidationIssue[],
  condition: boolean,
  field: RecipeValidationIssue['field'],
  message: string,
): void {
  if (condition) {
    issues.push({ field, level: 'warning', message });
  }
}
