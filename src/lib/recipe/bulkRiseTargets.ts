import { getEffectiveHydrationPercent } from './hydrationEquivalent.ts';
import type { FlourBlendEntry, FlourType, RecipeInput } from './types.ts';

export type RisePercentRange = {
  low: number;
  high: number;
};

export type BulkRiseTargets = {
  endOfBulk: RisePercentRange;
  /** Shown when very wet dough may spread and hide volume gain. */
  spreadNote: string | null;
};

/**
 * How much to scale down white-flour rise targets for each flour at 100% of the blend.
 *
 * Whole grain and rye trap gas less efficiently and ferment faster — bakers stop bulk
 * earlier on visual rise. Sources: Sourdough Archive (reduce 20–30% for high whole
 * grain); whole-wheat charts (20–40% at 75°F); rye blends (25–35%, not 50%+).
 */
const flourRisePenaltyByType: Record<FlourType, number> = {
  wheatType550: 0,
  wheatType1050: 0,
  pizzaFlour: 0,
  wholeWheat: 0.35,
  ryeType1150: 0.38,
  wholeRye: 0.4,
};

/** End-of-bulk rise anchors for 100% white wheat dough (before flour penalty). */
const temperatureRiseAnchors: readonly { tempC: number; low: number; high: number }[] = [
  { tempC: 18, low: 55, high: 75 },
  { tempC: 21, low: 45, high: 60 },
  { tempC: 24, low: 35, high: 50 },
  { tempC: 27, low: 25, high: 35 },
  { tempC: 29, low: 20, high: 28 },
];

export function getBulkRiseTargets(input: RecipeInput): BulkRiseTargets {
  const baseEndOfBulk = interpolateTemperatureRise(input.roomTemperatureCelsius);
  const flourPenalty = getWeightedFlourRisePenalty(input.doughFlours);
  const endOfBulk = applyFlourPenalty(baseEndOfBulk, flourPenalty);
  const hydrationAdjusted = applyHydrationAdjustment(endOfBulk, getEffectiveHydrationPercent(input));

  return {
    endOfBulk: hydrationAdjusted,
    spreadNote: getSpreadNote(getEffectiveHydrationPercent(input)),
  };
}

export function formatRisePercentRange(range: RisePercentRange): string {
  return `~${range.low}–${range.high}%`;
}

export function formatPreShapeRiseGuidance(targets: BulkRiseTargets): string {
  return `Pre-shape when the dough looks domed, smooth, and aerated — edges pulling from the bowl. Target ${formatRisePercentRange(targets.endOfBulk)} total volume rise since mix, not just because the clock says so.`;
}

export function formatEndOfBulkRiseGuidance(targets: BulkRiseTargets): string {
  return `End of bulk — target ${formatRisePercentRange(targets.endOfBulk)} volume rise since mix.`;
}

function interpolateTemperatureRise(tempC: number): RisePercentRange {
  const anchors = temperatureRiseAnchors;

  if (tempC <= anchors[0].tempC) {
    return { low: anchors[0].low, high: anchors[0].high };
  }

  const last = anchors[anchors.length - 1];
  if (tempC >= last.tempC) {
    return { low: last.low, high: last.high };
  }

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const current = anchors[index];
    const next = anchors[index + 1];

    if (tempC >= current.tempC && tempC <= next.tempC) {
      const progress = (tempC - current.tempC) / (next.tempC - current.tempC);
      return normalizeRange({
        low: current.low + (next.low - current.low) * progress,
        high: current.high + (next.high - current.high) * progress,
      });
    }
  }

  return { low: last.low, high: last.high };
}

function getWeightedFlourRisePenalty(doughFlours: FlourBlendEntry[]): number {
  return doughFlours.reduce((sum, entry) => {
    if (entry.percent <= 0) {
      return sum;
    }

    return sum + (entry.percent / 100) * flourRisePenaltyByType[entry.flourType];
  }, 0);
}

function applyFlourPenalty(range: RisePercentRange, penalty: number): RisePercentRange {
  const scale = 1 - clamp(penalty, 0, 0.45);
  return normalizeRange({
    low: range.low * scale,
    high: range.high * scale,
  });
}

function applyHydrationAdjustment(range: RisePercentRange, effectiveHydration: number): RisePercentRange {
  if (effectiveHydration <= 65) {
    return normalizeRange({ low: range.low, high: range.high - 5 });
  }

  return normalizeRange(range);
}

function getSpreadNote(effectiveHydration: number): string | null {
  if (effectiveHydration < 80) {
    return null;
  }

  return 'Very wet dough can spread outward in a wide bowl — a straight-sided container gives a clearer read.';
}

function normalizeRange(range: RisePercentRange): RisePercentRange {
  const low = roundToNearest5(clamp(range.low, 15, 90));
  const high = roundToNearest5(clamp(range.high, low + 5, 100));

  return { low, high };
}

function roundToNearest5(value: number): number {
  return Math.round(value / 5) * 5;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
