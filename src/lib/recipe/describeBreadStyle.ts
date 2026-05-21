import { getPrimaryFlourType } from './flourBlend.ts';
import { flourProfiles } from './flourProfiles.ts';
import type { RecipeInput } from './types.ts';

export function describeBreadStyle(recipeInput: RecipeInput): string {
  const flourLabel = getFlourStyleLabel(recipeInput);

  if (flourLabel === 'pizza') {
    return 'pizza';
  }

  return `${flourLabel} ${getHydrationStyleLabel(recipeInput)}`;
}

function getFlourStyleLabel(recipeInput: RecipeInput): string {
  const activeEntries = recipeInput.doughFlours.filter((entry) => entry.percent > 0);

  if (activeEntries.length === 0) {
    return 'bread';
  }

  const primary = getPrimaryFlourType(recipeInput.doughFlours);
  const ryeShare = activeEntries
    .filter((entry) => flourProfiles[entry.flourType].family === 'rye')
    .reduce((sum, entry) => sum + entry.percent, 0);
  const wholeShare = activeEntries
    .filter(
      (entry) => entry.flourType === 'wholeWheat' || entry.flourType === 'wholeRye',
    )
    .reduce((sum, entry) => sum + entry.percent, 0);

  if (primary === 'pizzaFlour') {
    return 'pizza';
  }

  if (ryeShare >= 20) {
    return wholeShare >= 10 ? 'rye and wholegrain' : 'rye';
  }

  if (wholeShare >= 30) {
    return 'whole wheat';
  }

  if (wholeShare >= 10) {
    return 'part-whole wheat';
  }

  if (primary === 'wheatType1050') {
    return 'dark wheat';
  }

  if (primary === 'wheatType550') {
    return 'white wheat';
  }

  return 'wheat';
}

function getHydrationStyleLabel(recipeInput: RecipeInput): string {
  const primary = getPrimaryFlourType(recipeInput.doughFlours);
  const profile = flourProfiles[primary];
  const hydration = recipeInput.hydrationPercent;

  if (hydration >= profile.highHydrationStartsAt) {
    return 'high hydration';
  }

  if (hydration <= profile.comfortableHydrationRange.low) {
    return 'low hydration';
  }

  return 'moderate hydration';
}
