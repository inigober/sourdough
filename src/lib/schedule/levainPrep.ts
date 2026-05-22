import type { LevainActivity } from '../recipe/types.ts';
import type { RecipeFormula } from '../recipe/types.ts';

export type FeedingAmounts = {
  starterGrams: number;
  flourGrams: number;
  waterGrams: number;
  totalGrams: number;
};

export type FeedingRatio = {
  starter: number;
  flour: number;
  water: number;
};

export const STARTER_REFRESH_RATIO: FeedingRatio = { starter: 1, flour: 3, water: 3 };
export const BASE_LEVAIN_BUILD_RATIO: FeedingRatio = { starter: 1, flour: 5, water: 5 };
export const STARTER_REFRESH_MIN_HOURS = 6;
export const FRIDGE_STARTER_TEMP_C = 4;
export const DEFAULT_LEVAIN_BUFFER_PERCENT = 15;
export const DEFAULT_LEVAIN_BUILD_HOURS = 12;
export const MAX_LEVAIN_RATIO_PARTS = 15;
export const MIN_LEVAIN_RATIO_PARTS = 3;

/**
 * Starter prep rules:
 * 1. Levain ratio scales with build hours, room temp, and levain activity so the build peaks at mix.
 * 2. Fridge starter (~4°C) normally gets a separate refresh step (1:3:3) before the levain build.
 *    Refresh duration scales with room temp — colder rooms warm the jar more slowly.
 * 3. Skip the refresh step when the base levain ratio is already high (> threshold) or at the max cap.
 *    A large single feeding can wake and ripen fridge starter in one step.
 * 4. When refresh is skipped, fold fridge wake-up into the levain ratio by adding equivalent hours
 *    derived from the gap between room temp and fridge starter temp (timeline still uses chosen build hours).
 */
export const SKIP_REFRESH_RATIO_THRESHOLD = 10;

export type StarterPrepPlan = {
  includeRefreshStep: boolean;
  levainBuildRatio: FeedingRatio;
  levainBuildHours: number;
  starterRefreshHours?: number;
  fridgeWakeEquivalentHours?: number;
  refreshSkippedBecause?: 'high_ratio' | 'max_ratio';
};

export function getDefaultLevainBuildHours(): number {
  return DEFAULT_LEVAIN_BUILD_HOURS;
}

/**
 * Cold fridge starter needs extra time before it behaves like room-temp culture.
 * Scales with the gap between room temp and typical fridge starter temp (~4°C).
 */
export function getFridgeWakeEquivalentHours(roomTemperatureCelsius: number): number {
  const roomAboveFridge = roomTemperatureCelsius - FRIDGE_STARTER_TEMP_C;
  const referenceRoomAboveFridge = 22 - FRIDGE_STARTER_TEMP_C;
  const referenceHours = 3;
  const scaled = referenceHours * (referenceRoomAboveFridge / roomAboveFridge);

  return clamp(roundToHalfHour(scaled), 2, 5);
}

/** Separate refresh step duration when fridge wake-up is not folded into the levain build. */
export function getStarterRefreshHours(roomTemperatureCelsius: number): number {
  const extraHours = getFridgeWakeEquivalentHours(roomTemperatureCelsius) - 3;

  return clamp(roundToHalfHour(STARTER_REFRESH_MIN_HOURS + extraHours), 5, 8);
}

export function getReferencePeakHoursForRatio(
  levainActivity: LevainActivity,
  roomTemperatureCelsius: number,
): number {
  const basePeakHoursByActivity: Record<LevainActivity, number> = {
    veryActive: 3.5,
    active: 4.5,
    recentlyRefreshedButNotPeaked: 5,
    sleepy: 6,
    inactive: 7,
  };

  const tempAdjusted =
    basePeakHoursByActivity[levainActivity] * (1 + (22 - roomTemperatureCelsius) * 0.08);

  return clamp(tempAdjusted, 2.5, 12);
}

export function getLevainBuildRatio(
  buildHours: number,
  roomTemperatureCelsius: number,
  levainActivity: LevainActivity,
): FeedingRatio {
  const referencePeakHours = getReferencePeakHoursForRatio(levainActivity, roomTemperatureCelsius);
  const flourWaterParts = clamp(
    Math.round(BASE_LEVAIN_BUILD_RATIO.flour * (buildHours / referencePeakHours)),
    MIN_LEVAIN_RATIO_PARTS,
    MAX_LEVAIN_RATIO_PARTS,
  );

  return {
    starter: 1,
    flour: flourWaterParts,
    water: flourWaterParts,
  };
}

export function planStarterPrep(input: {
  buildHours: number;
  roomTemperatureCelsius: number;
  levainActivity: LevainActivity;
  starterFromFridge: boolean;
}): StarterPrepPlan {
  const baseRatio = getLevainBuildRatio(
    input.buildHours,
    input.roomTemperatureCelsius,
    input.levainActivity,
  );

  if (!input.starterFromFridge) {
    return {
      includeRefreshStep: false,
      levainBuildRatio: baseRatio,
      levainBuildHours: input.buildHours,
    };
  }

  const shouldSkipRefresh =
    baseRatio.flour > SKIP_REFRESH_RATIO_THRESHOLD ||
    baseRatio.flour >= MAX_LEVAIN_RATIO_PARTS;

  if (!shouldSkipRefresh) {
    return {
      includeRefreshStep: true,
      levainBuildRatio: baseRatio,
      levainBuildHours: input.buildHours,
      starterRefreshHours: getStarterRefreshHours(input.roomTemperatureCelsius),
    };
  }

  const fridgeWakeHours = getFridgeWakeEquivalentHours(input.roomTemperatureCelsius);
  const foldedRatio = getLevainBuildRatio(
    input.buildHours + fridgeWakeHours,
    input.roomTemperatureCelsius,
    input.levainActivity,
  );

  return {
    includeRefreshStep: false,
    levainBuildRatio: foldedRatio,
    levainBuildHours: input.buildHours,
    fridgeWakeEquivalentHours: fridgeWakeHours,
    refreshSkippedBecause:
      baseRatio.flour >= MAX_LEVAIN_RATIO_PARTS ? 'max_ratio' : 'high_ratio',
  };
}

export function describeStarterPrepPlan(plan: StarterPrepPlan): string {
  if (!plan.refreshSkippedBecause) {
    if (plan.includeRefreshStep) {
      const refreshHours = plan.starterRefreshHours ?? STARTER_REFRESH_MIN_HOURS;
      return `Starts with a ~${refreshHours} h refresh from ~${FRIDGE_STARTER_TEMP_C}°C fridge starter, then the levain build.`;
    }

    return 'Levain build only — no separate refresh step.';
  }

  return `Fridge refresh is built into the ${formatRatioLabel(plan.levainBuildRatio)} levain feeding.`;
}

export function formatStarterRefreshLabel(refreshHours: number): string {
  return `Refresh starter (~${refreshHours} h)`;
}

export function formatRatioLabel(ratio: FeedingRatio): string {
  return `1:${ratio.flour}:${ratio.water}`;
}

export function formatLevainBuildHoursLabel(hours: number): string {
  const formatted = Number.isInteger(hours) ? String(hours) : String(hours);
  return `${formatted} h`;
}

export function calculateRatioFeeding(totalGrams: number, ratio: FeedingRatio): FeedingAmounts {
  const parts = ratio.starter + ratio.flour + ratio.water;

  return roundFeeding({
    starterGrams: (totalGrams * ratio.starter) / parts,
    flourGrams: (totalGrams * ratio.flour) / parts,
    waterGrams: (totalGrams * ratio.water) / parts,
    totalGrams,
  });
}

export function calculateStarterRefreshFeeding(): FeedingAmounts {
  return calculateRatioFeeding(70, STARTER_REFRESH_RATIO);
}

export function calculateLevainBuildFeeding(
  formula: RecipeFormula,
  ratio: FeedingRatio,
  bufferPercent = DEFAULT_LEVAIN_BUFFER_PERCENT,
): FeedingAmounts {
  const targetLevainGrams = formula.levainGrams * (1 + bufferPercent / 100);
  return calculateRatioFeeding(targetLevainGrams, ratio);
}

export function formatLevainBuildDetail(
  ratioLabel: string,
  mixStartTime: string,
  refreshSkippedBecause?: 'max_ratio' | 'high_ratio',
): string {
  if (refreshSkippedBecause) {
    return `${ratioLabel} feeding · includes fridge refresh · ready at ${mixStartTime}`;
  }

  return `${ratioLabel} feeding · ready for mix at ${mixStartTime}`;
}

export function formatFeedingDetail(amounts: FeedingAmounts, ratioLabel: string): string {
  return `${ratioLabel} · ${Math.round(amounts.starterGrams)}g starter + ${Math.round(amounts.flourGrams)}g flour + ${Math.round(amounts.waterGrams)}g water (${Math.round(amounts.totalGrams)}g total)`;
}

function roundFeeding(amounts: FeedingAmounts): FeedingAmounts {
  return {
    starterGrams: roundGrams(amounts.starterGrams),
    flourGrams: roundGrams(amounts.flourGrams),
    waterGrams: roundGrams(amounts.waterGrams),
    totalGrams: roundGrams(amounts.totalGrams),
  };
}

function roundGrams(value: number): number {
  return Math.max(1, Math.round(value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToHalfHour(value: number): number {
  return Math.round(value * 2) / 2;
}
