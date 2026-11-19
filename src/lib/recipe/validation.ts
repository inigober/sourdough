import { getFlourBlendTotalPercent } from './flourBlend.ts';
import type { RecipeInput, RecipeValidationIssue } from './types.ts';

/**
 * Dough weight limits, in grams.
 * The formula maths is linear, so it works at any positive weight. The limits come from what the
 * rest of the app and a home kitchen can honour:
 * - Below about 300g, salt and levain amounts shrink to a few grams (50g gives 1g salt, 5g levain)
 *   and the fixed bake-time floor and fold counts no longer match the dough.
 * - Above about 3kg, the Dutch oven bake time scales linearly (110 minutes at 3kg) and the dough
 *   no longer fits a home oven or mixing bowl.
 * Outside the warning range is allowed. Outside the hard range is blocked. The hard minimum is the
 * old field minimum (50g), so every recipe the app could already save still opens.
 */
export const DOUGH_WEIGHT_LIMITS = {
  min: 50,
  max: 10000,
  warnBelow: 300,
  warnAbove: 3000,
} as const;

export function validateRecipeInput(input: RecipeInput): RecipeValidationIssue[] {
  const issues: RecipeValidationIssue[] = [];

  addNumberErrorIfNeeded(issues, input.finalDoughWeightGrams, 'finalDoughWeightGrams', 'Enter a final dough weight.');
  addNumberErrorIfNeeded(issues, input.numberOfLoaves, 'numberOfLoaves', 'Enter a number of loaves.');
  addNumberErrorIfNeeded(issues, input.hydrationPercent, 'hydrationPercent', 'Enter a hydration percentage.');
  addNumberErrorIfNeeded(issues, input.saltPercent, 'saltPercent', 'Enter a salt percentage.');
  addNumberErrorIfNeeded(issues, input.levainHydrationPercent, 'levainHydrationPercent', 'Enter a levain hydration percentage.');
  addNumberErrorIfNeeded(issues, input.targetBulkHours, 'targetBulkHours', 'Enter a target bulk fermentation time in hours.');
  addNumberErrorIfNeeded(issues, input.roomTemperatureCelsius, 'roomTemperatureCelsius', 'Enter a room temperature.');

  if (hasBlockingValidationIssue(issues)) {
    return issues;
  }

  addErrorIf(
    issues,
    input.finalDoughWeightGrams < DOUGH_WEIGHT_LIMITS.min || input.finalDoughWeightGrams > DOUGH_WEIGHT_LIMITS.max,
    'finalDoughWeightGrams',
    'Final dough weight must be between 50g and 10,000g.',
  );
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

  addWarningIf(
    issues,
    input.finalDoughWeightGrams >= DOUGH_WEIGHT_LIMITS.min && input.finalDoughWeightGrams < DOUGH_WEIGHT_LIMITS.warnBelow,
    'finalDoughWeightGrams',
    'Under about 300g, timings and levain amounts stop being reliable.',
  );
  addWarningIf(
    issues,
    input.finalDoughWeightGrams > DOUGH_WEIGHT_LIMITS.warnAbove && input.finalDoughWeightGrams <= DOUGH_WEIGHT_LIMITS.max,
    'finalDoughWeightGrams',
    'Over about 3kg, bake times and oven or bowl size stop being realistic for a home bake.',
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

/** True when a number field has been cleared (or holds no real number). Such input is not worth saving as a draft. */
export function hasMissingNumber(input: RecipeInput): boolean {
  return [
    input.finalDoughWeightGrams,
    input.numberOfLoaves,
    input.hydrationPercent,
    input.saltPercent,
    input.levainHydrationPercent,
    input.targetBulkHours,
    input.roomTemperatureCelsius,
  ].some((value) => !Number.isFinite(value));
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
