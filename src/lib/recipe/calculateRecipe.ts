import { estimateTotalFlourGrams, getWeightedFermentationSpeedMultiplier } from './flourBlend.ts';
import { flourProfiles } from './flourProfiles.ts';
import { hasBlockingValidationIssue, validateRecipeInput } from './validation.ts';
import type { LevainActivity, RecipeFormula, RecipeInput } from './types.ts';

export { estimateTotalFlourGrams };

const bulkFermentationTargets = [
  { hours: 2, prefermentedFlourPercent: 28 },
  { hours: 3, prefermentedFlourPercent: 28 },
  { hours: 4, prefermentedFlourPercent: 23 },
  { hours: 5, prefermentedFlourPercent: 18 },
  { hours: 6, prefermentedFlourPercent: 14 },
  { hours: 8, prefermentedFlourPercent: 10 },
  { hours: 10, prefermentedFlourPercent: 7 },
  { hours: 12, prefermentedFlourPercent: 5 },
] as const;

const levainActivityMultipliers: Record<LevainActivity, number> = {
  veryActive: 0.9,
  active: 1,
  recentlyRefreshedButNotPeaked: 1.15,
  sleepy: 1.35,
  inactive: 1.35,
};

export function calculateRecipe(input: RecipeInput): RecipeFormula {
  const validationIssues = validateRecipeInput(input);

  if (hasBlockingValidationIssue(validationIssues)) {
    throw new Error('Recipe input has blocking validation issues.');
  }

  const hydration = input.hydrationPercent / 100;
  const saltRate = input.saltPercent / 100;
  const levainHydration = input.levainHydrationPercent / 100;

  const totalFlourGrams = estimateTotalFlourGrams(input);
  const totalWaterGrams = totalFlourGrams * hydration;
  const saltGrams = totalFlourGrams * saltRate;
  const prefermentedFlourPercent = estimatePrefermentedFlourPercent(input);
  const levainFlourGrams = totalFlourGrams * (prefermentedFlourPercent / 100);
  const levainWaterGrams = levainFlourGrams * levainHydration;
  const levainGrams = levainFlourGrams + levainWaterGrams;
  const addedFlourGrams = totalFlourGrams - levainFlourGrams;
  const addedWaterGrams = totalWaterGrams - levainWaterGrams;

  if (addedFlourGrams < 0 || addedWaterGrams < 0) {
    throw new Error('Recipe formula produced impossible added flour or water values.');
  }

  const perLoafDoughWeightGrams = input.finalDoughWeightGrams / input.numberOfLoaves;

  return roundFormula({
    totalFlourGrams,
    totalWaterGrams,
    addedFlourGrams,
    addedWaterGrams,
    saltGrams,
    levainGrams,
    levainFlourGrams,
    levainWaterGrams,
    overallHydrationPercent: input.hydrationPercent,
    prefermentedFlourPercent,
    perLoafDoughWeightGrams,
    estimatedBakedLoafWeightGrams: {
      low: perLoafDoughWeightGrams * 0.85,
      high: perLoafDoughWeightGrams * 0.9,
    },
  });
}

export function estimatePrefermentedFlourPercent(input: RecipeInput): number {
  const basePrefermentedFlourPercent = interpolatePrefermentedFlour(input.targetBulkHours);
  const temperatureDelta = 24 - input.roomTemperatureCelsius;
  const temperatureMultiplier = clamp(1 + temperatureDelta * 0.08, 0.65, 1.45);
  const levainActivityMultiplier = levainActivityMultipliers[input.levainActivity];
  const flourSpeedMultiplier = getAverageFlourSpeedMultiplier(input);

  return roundTo(
    clamp(
      basePrefermentedFlourPercent *
        temperatureMultiplier *
        levainActivityMultiplier *
        flourSpeedMultiplier,
      4,
      30,
    ),
    1,
  );
}

function interpolatePrefermentedFlour(targetBulkHours: number): number {
  const firstTarget = bulkFermentationTargets[0];
  const lastTarget = bulkFermentationTargets[bulkFermentationTargets.length - 1];

  if (targetBulkHours <= firstTarget.hours) {
    return firstTarget.prefermentedFlourPercent;
  }

  if (targetBulkHours >= lastTarget.hours) {
    return lastTarget.prefermentedFlourPercent;
  }

  for (let index = 0; index < bulkFermentationTargets.length - 1; index += 1) {
    const current = bulkFermentationTargets[index];
    const next = bulkFermentationTargets[index + 1];

    if (targetBulkHours >= current.hours && targetBulkHours <= next.hours) {
      const progress = (targetBulkHours - current.hours) / (next.hours - current.hours);
      return current.prefermentedFlourPercent +
        (next.prefermentedFlourPercent - current.prefermentedFlourPercent) * progress;
    }
  }

  return lastTarget.prefermentedFlourPercent;
}

function getAverageFlourSpeedMultiplier(input: RecipeInput): number {
  const doughMultiplier = getWeightedFermentationSpeedMultiplier(input.doughFlours);
  const levainMultiplier = flourProfiles[input.levainFlourType].fermentationSpeedMultiplier;

  return (doughMultiplier + levainMultiplier) / 2;
}

function roundFormula(formula: RecipeFormula): RecipeFormula {
  return {
    totalFlourGrams: roundTo(formula.totalFlourGrams, 1),
    totalWaterGrams: roundTo(formula.totalWaterGrams, 1),
    addedFlourGrams: roundTo(formula.addedFlourGrams, 1),
    addedWaterGrams: roundTo(formula.addedWaterGrams, 1),
    saltGrams: roundTo(formula.saltGrams, 1),
    levainGrams: roundTo(formula.levainGrams, 1),
    levainFlourGrams: roundTo(formula.levainFlourGrams, 1),
    levainWaterGrams: roundTo(formula.levainWaterGrams, 1),
    overallHydrationPercent: roundTo(formula.overallHydrationPercent, 1),
    prefermentedFlourPercent: roundTo(formula.prefermentedFlourPercent, 1),
    perLoafDoughWeightGrams: roundTo(formula.perLoafDoughWeightGrams, 1),
    estimatedBakedLoafWeightGrams: {
      low: roundTo(formula.estimatedBakedLoafWeightGrams.low, 1),
      high: roundTo(formula.estimatedBakedLoafWeightGrams.high, 1),
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
