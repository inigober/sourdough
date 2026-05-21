import type { RecipeInput } from '../recipe/types.ts';
import {
  getBakeTempsForPerLoafGrams,
  getDutchOvenPhaseMinutes,
} from './defaults.ts';
import type { ScheduleInput } from './types.ts';

export function scaleScheduleBakeParamsForDoughSize(
  recipeInput: RecipeInput,
  schedule: ScheduleInput,
): ScheduleInput {
  const perLoafGrams = recipeInput.finalDoughWeightGrams / recipeInput.numberOfLoaves;
  const bakeTemps = getBakeTempsForPerLoafGrams(perLoafGrams);
  const dutchOvenPhases = getDutchOvenPhaseMinutes(recipeInput.finalDoughWeightGrams);
  const openBakeTotal = dutchOvenPhases.closed + dutchOvenPhases.lidOff + dutchOvenPhases.outOfPot;

  return {
    ...schedule,
    openBakeTempCelsius: bakeTemps.openBakeTempCelsius,
    finishTempCelsius: bakeTemps.finishTempCelsius,
    dutchOvenClosedMinutes: dutchOvenPhases.closed,
    dutchOvenLidOffMinutes: dutchOvenPhases.lidOff,
    dutchOvenOutOfPotMinutes: dutchOvenPhases.outOfPot,
    openBakeMinutes: Math.round(openBakeTotal * 0.7),
    finishMinutes: Math.round(openBakeTotal * 0.3),
  };
}
