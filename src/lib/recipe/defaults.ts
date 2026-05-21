import { createFlourBlendEntry } from './flourBlend.ts';
import type { LevainType, RecipeInput } from './types.ts';

export const levainHydrationPresets: Record<Exclude<LevainType, 'customHydration'>, number> = {
  stiffLevain: 60,
  standard100: 100,
  liquidLevain: 140,
};

export function getLevainHydrationForType(
  levainType: LevainType,
  currentHydrationPercent: number,
): number {
  if (levainType === 'customHydration') {
    return currentHydrationPercent;
  }

  return levainHydrationPresets[levainType];
}

export const defaultRecipeInput: RecipeInput = {
  finalDoughWeightGrams: 900,
  numberOfLoaves: 1,
  hydrationPercent: 80,
  saltPercent: 2,
  doughFlours: [createFlourBlendEntry('wheatType1050', 100)],
  levainFlourType: 'wheatType1050',
  targetBulkHours: 6,
  roomTemperatureCelsius: 24,
  levainType: 'standard100',
  levainHydrationPercent: levainHydrationPresets.standard100,
  levainActivity: 'active',
};
