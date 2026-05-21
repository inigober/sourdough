import type { RecipeInput } from '../recipe/types.ts';
import type { FoldDefaults, ScheduleInput } from './types.ts';

export function getDefaultFoldSets(hydrationPercent: number): FoldDefaults {
  if (hydrationPercent <= 72) {
    return { stretchAndFoldSets: 2, coilFoldSets: 0, slapAndFoldSlaps: 0, foldRestMinutes: 30 };
  }

  if (hydrationPercent <= 82) {
    return { stretchAndFoldSets: 3, coilFoldSets: 0, slapAndFoldSlaps: 0, foldRestMinutes: 30 };
  }

  if (hydrationPercent <= 88) {
    return { stretchAndFoldSets: 4, coilFoldSets: 2, slapAndFoldSlaps: 0, foldRestMinutes: 30 };
  }

  return { stretchAndFoldSets: 4, coilFoldSets: 3, slapAndFoldSlaps: 0, foldRestMinutes: 25 };
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
  const foldDefaults = getDefaultFoldSets(recipeInput.hydrationPercent);
  const perLoafGrams = recipeInput.finalDoughWeightGrams / recipeInput.numberOfLoaves;
  const bakeTemps = getBakeTempsForPerLoafGrams(perLoafGrams);
  const dutchOvenPhases = getDutchOvenPhaseMinutes(recipeInput.finalDoughWeightGrams);
  const openBakeTotal = dutchOvenPhases.closed + dutchOvenPhases.lidOff + dutchOvenPhases.outOfPot;

  return {
    startTime: '09:00',
    autolyseEnabled: true,
    autolyseMinutes: 45,
    restAfterAutolyseMinutes: 30,
    mixMinutes: 10,
    saltAfterLevain: true,
    saltMixMinutes: 5,
    restAfterMixMinutes: 30,
    slapAndFoldSlaps: foldDefaults.slapAndFoldSlaps,
    stretchAndFoldSets: foldDefaults.stretchAndFoldSets,
    stretchAndFoldRestMinutes: foldDefaults.foldRestMinutes,
    coilFoldSets: foldDefaults.coilFoldSets,
    coilFoldRestMinutes: foldDefaults.foldRestMinutes,
    preShapeMinutesBeforeBulkEnd: 30,
    shapeMinutes: 10,
    proofingStyle: 'cold',
    coldRetardHours: 14,
    roomProofHours: getDefaultRoomProofHours(recipeInput.roomTemperatureCelsius),
    roomFinishAfterColdHours: 1.5,
    bakeMethod: 'dutchOven',
    dutchOvenClosedMinutes: dutchOvenPhases.closed,
    dutchOvenLidOffMinutes: dutchOvenPhases.lidOff,
    dutchOvenOutOfPotMinutes: dutchOvenPhases.outOfPot,
    openBakeMinutes: Math.round(openBakeTotal * 0.7),
    finishMinutes: Math.round(openBakeTotal * 0.3),
    openBakeTempCelsius: bakeTemps.openBakeTempCelsius,
    finishTempCelsius: bakeTemps.finishTempCelsius,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
