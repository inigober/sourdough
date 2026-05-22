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
export const DEFAULT_LEVAIN_BUFFER_PERCENT = 15;
export const DEFAULT_LEVAIN_BUILD_HOURS = 12;
export const MAX_LEVAIN_RATIO_PARTS = 15;
export const MIN_LEVAIN_RATIO_PARTS = 3;

/**
 * Starter prep rules:
 * 1. Levain ratio scales with build hours, room temp, and levain activity so the build peaks at mix.
 * 2. Fridge starter is inactive when taken out and needs a refresh before the levain build.
 *    A separate 1:3:3 refresh step is scheduled when the build ratio is moderate.
 * 3. Skip the refresh step when the base levain ratio is already high (> threshold) or at the max cap.
 *    A large single feeding can wake and ripen fridge starter in one step.
 * 4. Fridge inactive state always increases the levain ratio via equivalent build hours:
 *    - separate refresh: smaller bump (refresh handles wake-up; build still from recovering culture)
 *    - folded refresh: full refresh equivalent added to the ratio calculation
 */
export const SKIP_REFRESH_RATIO_THRESHOLD = 10;
/** Extra build hours folded into levain ratio after a separate fridge refresh step. */
export const FRIDGE_LEVAIN_EXTRA_HOURS_AFTER_REFRESH = 2;
/** Refresh time folded into levain ratio when no separate refresh step is scheduled. */
export const FRIDGE_REFRESH_EQUIVALENT_HOURS_FOLDED = STARTER_REFRESH_MIN_HOURS;

export type StarterPrepPlan = {
  includeRefreshStep: boolean;
  levainBuildRatio: FeedingRatio;
  levainBuildHours: number;
  refreshSkippedBecause?: 'high_ratio' | 'max_ratio';
};

export function getDefaultLevainBuildHours(): number {
  return DEFAULT_LEVAIN_BUILD_HOURS;
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
  const roomTempRatio = getLevainBuildRatio(
    input.buildHours,
    input.roomTemperatureCelsius,
    input.levainActivity,
  );

  if (!input.starterFromFridge) {
    return {
      includeRefreshStep: false,
      levainBuildRatio: roomTempRatio,
      levainBuildHours: input.buildHours,
    };
  }

  const shouldSkipRefresh =
    roomTempRatio.flour > SKIP_REFRESH_RATIO_THRESHOLD ||
    roomTempRatio.flour >= MAX_LEVAIN_RATIO_PARTS;

  if (!shouldSkipRefresh) {
    return {
      includeRefreshStep: true,
      levainBuildRatio: getLevainBuildRatio(
        input.buildHours + FRIDGE_LEVAIN_EXTRA_HOURS_AFTER_REFRESH,
        input.roomTemperatureCelsius,
        input.levainActivity,
      ),
      levainBuildHours: input.buildHours,
    };
  }

  return {
    includeRefreshStep: false,
    levainBuildRatio: getLevainBuildRatio(
      input.buildHours + FRIDGE_REFRESH_EQUIVALENT_HOURS_FOLDED,
      input.roomTemperatureCelsius,
      input.levainActivity,
    ),
    levainBuildHours: input.buildHours,
    refreshSkippedBecause:
      roomTempRatio.flour >= MAX_LEVAIN_RATIO_PARTS ? 'max_ratio' : 'high_ratio',
  };
}

export function describeStarterPrepPlan(plan: StarterPrepPlan): string {
  if (!plan.refreshSkippedBecause) {
    if (plan.includeRefreshStep) {
      return `Starts with a ${STARTER_REFRESH_MIN_HOURS} h refresh — fridge starter is inactive until fed — then the levain build.`;
    }

    return 'Levain build only — no separate refresh step.';
  }

  return `Fridge refresh is built into the ${formatRatioLabel(plan.levainBuildRatio)} levain feeding.`;
}

export function formatStarterRefreshLabel(): string {
  return `Refresh starter (~${STARTER_REFRESH_MIN_HOURS} h)`;
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
