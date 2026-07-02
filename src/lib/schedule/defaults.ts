import type { RecipeInput } from '../recipe/types.ts';
import { getTomorrowIsoDate } from './dates.ts';
import { getDefaultLevainBuildHours } from './levainPrep.ts';
import type { FoldDefaults, ScheduleInput } from './types.ts';

export function getDefaultSlapAndFolds(recipeInput: RecipeInput): number {
  return recipeInput.hydrationPercent >= 80 ? 50 : 0;
}

export function getDefaultFoldSets(recipeInput: RecipeInput): FoldDefaults {
  const hydrationPercent = recipeInput.hydrationPercent;

  if (hydrationPercent <= 72) {
    return { stretchAndFoldSets: 2, coilFoldSets: 0, slapAndFolds: 0, foldRestMinutes: 30 };
  }

  if (hydrationPercent < 80) {
    return {
      stretchAndFoldSets: 3,
      coilFoldSets: 0,
      slapAndFolds: getDefaultSlapAndFolds(recipeInput),
      foldRestMinutes: 30,
    };
  }

  return {
    stretchAndFoldSets: 3,
    coilFoldSets: 3,
    slapAndFolds: getDefaultSlapAndFolds(recipeInput),
    foldRestMinutes: 30,
  };
}

export function getDefaultRoomProofHours(roomTemperatureCelsius: number): number {
  return clamp(4.5 - 0.12 * roomTemperatureCelsius, 1, 4);
}

export function getBakeTempsForPerLoafGrams(perLoafGrams: number): {
  openBakeTempCelsius: number;
  finishTempCelsius: number;
} {
  if (perLoafGrams <= 600) {
    return { openBakeTempCelsius: 260, finishTempCelsius: 210 };
  }

  if (perLoafGrams <= 900) {
    return { openBakeTempCelsius: 250, finishTempCelsius: 205 };
  }

  return { openBakeTempCelsius: 245, finishTempCelsius: 200 };
}

export function getDutchOvenPhaseMinutes(totalDoughWeightGrams: number): {
  closed: number;
  lidOff: number;
  outOfPot: number;
} {
  const totalMinutes = Math.max(35, Math.round(55 * (totalDoughWeightGrams / 1500)));
  const closed = Math.round(totalMinutes * (30 / 55));
  const lidOff = Math.round(totalMinutes * (20 / 55));
  const outOfPot = Math.max(5, totalMinutes - closed - lidOff);

  return { closed, lidOff, outOfPot };
}

export function getSlapAndFoldDurationMinutes(slapCount: number): number {
  if (slapCount <= 0) {
    return 0;
  }

  return clamp(Math.round(slapCount / 10), 5, 12);
}

export function createDefaultScheduleInput(recipeInput: RecipeInput): ScheduleInput {
  const foldDefaults = getDefaultFoldSets(recipeInput);
  const perLoafGrams = recipeInput.finalDoughWeightGrams / recipeInput.numberOfLoaves;
  const bakeTemps = getBakeTempsForPerLoafGrams(perLoafGrams);
  const dutchOvenPhases = getDutchOvenPhaseMinutes(recipeInput.finalDoughWeightGrams);
  const openBakeTotal = dutchOvenPhases.closed + dutchOvenPhases.lidOff + dutchOvenPhases.outOfPot;
  const autolyseRecommendation = recipeInput.hydrationPercent >= 72;

  return {
    mixDate: getTomorrowIsoDate(),
    startTime: '09:00',
    autolyseEnabled: autolyseRecommendation,
    autolyseMinutes: 45,
    saltAfterLevain: true,
    restAfterLevainMinutes: 30,
    restAfterSaltMinutes: 30,
    slapAndFolds: foldDefaults.slapAndFolds,
    restAfterSlapAndFoldMinutes: 30,
    stretchAndFoldSets: foldDefaults.stretchAndFoldSets,
    stretchAndFoldRestMinutes: foldDefaults.foldRestMinutes,
    coilFoldSets: foldDefaults.coilFoldSets,
    coilFoldRestMinutes: foldDefaults.foldRestMinutes,
    preShapeMinutesBeforeBulkEnd: 30,
    proofingStyle: 'cold',
    desiredBakeTime: '08:00',
    roomProofHours: getDefaultRoomProofHours(recipeInput.roomTemperatureCelsius),
    bakeMethod: 'dutchOven',
    dutchOvenClosedMinutes: dutchOvenPhases.closed,
    dutchOvenLidOffMinutes: dutchOvenPhases.lidOff,
    dutchOvenOutOfPotMinutes: dutchOvenPhases.outOfPot,
    openBakeMinutes: Math.round(openBakeTotal * 0.7),
    finishMinutes: Math.round(openBakeTotal * 0.3),
    openBakeTempCelsius: bakeTemps.openBakeTempCelsius,
    finishTempCelsius: bakeTemps.finishTempCelsius,
    includeStarterPrep: true,
    starterFromFridge: true,
    levainBuildHours: getDefaultLevainBuildHours(),
    levainBufferPercent: 15,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
