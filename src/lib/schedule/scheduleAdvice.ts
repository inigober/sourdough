import { getPrimaryFlourType } from '../recipe/flourBlend.ts';
import { flourProfiles } from '../recipe/flourProfiles.ts';
import type { RecipeInput } from '../recipe/types.ts';
import type { ProofingStyle } from './types.ts';
import { roundColdRetardHoursUp } from './scheduleTiming.ts';

export function getAutolyseRecommendation(recipeInput: RecipeInput): {
  recommended: boolean;
  summary: string;
} {
  const primaryFlour = flourProfiles[getPrimaryFlourType(recipeInput.doughFlours)];
  const isHighHydration = recipeInput.hydrationPercent >= primaryFlour.highHydrationStartsAt;
  const hasWholegrain = recipeInput.doughFlours.some(
    (entry) =>
      entry.percent >= 15 &&
      (entry.flourType === 'wholeWheat' || entry.flourType === 'wholeRye' || entry.flourType === 'ryeType1150'),
  );

  if (isHighHydration) {
    return {
      recommended: true,
      summary: `Recommended for this ${recipeInput.hydrationPercent}% ${primaryFlour.label} dough — autolyse helps water absorb before salt and levain tighten the dough.`,
    };
  }

  if (hasWholegrain) {
    return {
      recommended: true,
      summary:
        'Recommended here because wholegrain or rye in the blend benefits from a rest before salt and levain are added.',
    };
  }

  if (recipeInput.hydrationPercent <= primaryFlour.comfortableHydrationRange.low) {
    return {
      recommended: false,
      summary: `Optional for this lower ${recipeInput.hydrationPercent}% dough on ${primaryFlour.label}. You can skip it if the flour hydrates easily.`,
    };
  }

  return {
    recommended: true,
    summary: `Useful for this ${recipeInput.hydrationPercent}% dough — a short rest can improve extensibility before mixing in levain and salt.`,
  };
}

export function getAutolyseTimeAdvice(recipeInput: RecipeInput): string {
  const primaryFlour = flourProfiles[getPrimaryFlourType(recipeInput.doughFlours)];

  if (recipeInput.hydrationPercent >= primaryFlour.highHydrationStartsAt) {
    return '45–60 minutes is typical for higher hydration doughs like this one.';
  }

  if (recipeInput.hydrationPercent >= primaryFlour.comfortableHydrationRange.high) {
    return '30–45 minutes is usually enough for this hydration level.';
  }

  return '20–30 minutes is often plenty for stiffer doughs.';
}

export function getProofingStyleAdvice(
  recipeInput: RecipeInput,
  proofingStyle: ProofingStyle,
): string {
  const warmRoom = recipeInput.roomTemperatureCelsius >= 24;

  if (proofingStyle === 'roomTemperature') {
    return warmRoom
      ? 'Fastest schedule and more fermentation activity. Best when you can watch the dough closely in a warm kitchen.'
      : 'Simple same-day schedule. Easier to time, but less flavor development than a cold retard.';
  }

  if (proofingStyle === 'cold') {
    return 'Slower final rise in the fridge — deeper flavor, easier scoring, and a more forgiving bake window.';
  }

  return 'Choose room temperature or cold retard based on your schedule and flavor goals.';
}

export function getColdRetardAssessmentLevel(
  coldRetardHours: number,
): 'positive' | 'warning' | 'risk' | 'info' {
  const hours = roundColdRetardHoursUp(coldRetardHours);

  if (hours < 8) {
    return 'warning';
  }

  if (hours <= 16) {
    return 'positive';
  }

  if (hours <= 22) {
    return 'warning';
  }

  return 'risk';
}

export function getColdRetardAssessment(coldRetardHours: number): string {
  const hours = roundColdRetardHoursUp(coldRetardHours);

  if (hours < 8) {
    return 'Short for overnight flavor — dough may still feel tight.';
  }

  if (hours <= 16) {
    return 'Typical overnight range.';
  }

  if (hours <= 22) {
    return 'On the long side — check jiggle before baking.';
  }

  return 'Very long — risk of over-proofing.';
}

export function getTotalBakeMinutes(schedule: {
  bakeMethod: 'dutchOven' | 'open';
  dutchOvenClosedMinutes: number;
  dutchOvenLidOffMinutes: number;
  dutchOvenOutOfPotMinutes: number;
  openBakeMinutes: number;
  finishMinutes: number;
}): number {
  if (schedule.bakeMethod === 'dutchOven') {
    return schedule.dutchOvenClosedMinutes + schedule.dutchOvenLidOffMinutes + schedule.dutchOvenOutOfPotMinutes;
  }

  return schedule.openBakeMinutes + schedule.finishMinutes;
}
