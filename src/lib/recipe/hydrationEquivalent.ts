import { getPrimaryFlourType } from './flourBlend.ts';
import { flourProfiles } from './flourProfiles.ts';
import type { FlourBlendEntry, FlourType, RecipeInput } from './types.ts';

/**
 * How many percentage points to subtract from nominal hydration to reach a
 * white-bread-flour (Type 550) dough-feel equivalent.
 *
 * High-absorption flours (bran, pentosans) need more water for the same
 * consistency. Sources: ASB whole-grain absorption notes; common baker rule of
 * +5–10% water when substituting whole wheat for white; The Dough Formula
 * guideline of +1–2% hydration per 10% wholegrain in the blend.
 */
export const hydrationEquivalentOffsetByFlour: Record<FlourType, number> = {
  wheatType550: 0,
  wheatType1050: -3,
  pizzaFlour: 2,
  wholeWheat: -7,
  ryeType1150: -5,
  wholeRye: -8,
};

/**
 * Nominal hydration adjusted for flour absorption so scheduling bands (folds,
 * slap-and-folds) match how the dough handles, not just the baker's % on paper.
 *
 * Example: 87% hydration on 100% whole wheat ≈ 80% effective (white-equivalent).
 */
/**
 * Flour-relative high-hydration band expressed in white-flour handling terms.
 *
 * Example: Type 1050 starts at 83% nominal but handles like 80% on white flour,
 * so 83% on Type 1050 should not trigger a high-hydration warning.
 */
export function getEffectiveHighHydrationThreshold(input: RecipeInput): number {
  const primaryFlour = flourProfiles[getPrimaryFlourType(input.doughFlours)];
  return roundHydration(primaryFlour.highHydrationStartsAt + getHydrationBlendOffset(input.doughFlours));
}

export function isHighEffectiveHydration(input: RecipeInput): boolean {
  return getEffectiveHydrationPercent(input) > getEffectiveHighHydrationThreshold(input);
}

export function getEffectiveHydrationPercent(input: RecipeInput): number {
  return roundHydration(input.hydrationPercent + getHydrationBlendOffset(input.doughFlours));
}

export function getHydrationBlendOffset(doughFlours: FlourBlendEntry[]): number {
  return doughFlours.reduce((sum, entry) => {
    if (entry.percent <= 0) {
      return sum;
    }

    const flourOffset = hydrationEquivalentOffsetByFlour[entry.flourType];
    return sum + (entry.percent / 100) * flourOffset;
  }, 0);
}

export function describeEffectiveHydration(input: RecipeInput): string | null {
  const effective = getEffectiveHydrationPercent(input);
  const delta = roundHydration(effective - input.hydrationPercent);

  if (Math.abs(delta) < 1) {
    return null;
  }

  const direction = delta < 0 ? 'firmer' : 'wetter';
  const primaryFlour = input.doughFlours.find((entry) => entry.percent > 0);
  const flourLabel = primaryFlour ? flourProfiles[primaryFlour.flourType].label : 'this blend';

  return `${input.hydrationPercent}% nominal hydration on ${flourLabel} handles like ~${effective}% on white flour — ${direction} than the number alone suggests.`;
}

function roundHydration(value: number): number {
  return Math.round(value * 10) / 10;
}
