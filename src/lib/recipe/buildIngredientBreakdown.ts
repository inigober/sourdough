import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import {
  STARTER_REFRESH_RATIO,
  calculateLevainBuildFeeding,
  calculateStarterRefreshFeeding,
  formatRatioLabel,
  planStarterPrep,
  type FeedingAmounts,
} from '../schedule/levainPrep.ts';
import type { ScheduleInput } from '../schedule/types.ts';
import { flourProfiles } from './flourProfiles.ts';
import { buildIngredientRows } from './formatIngredients.ts';
import type { RecipeFormula, RecipeInput } from './types.ts';

/** What kind of thing a line is. The UI picks an icon and an accent colour from this. */
export type IngredientKind = 'flour' | 'water' | 'salt' | 'levain' | 'starter';

export type IngredientLine = {
  kind: IngredientKind;
  label: string;
  grams: number;
  /** Small second line under the label, e.g. which flour goes into the levain. */
  note?: string;
};

export type FeedingBreakdown = {
  ratioLabel: string;
  lines: IngredientLine[];
  totalGrams: number;
};

export type LevainBuildBreakdown = {
  /** The final build that becomes the levain in the dough. */
  build: FeedingBreakdown;
  buildHours: number;
  bufferPercent: number;
  /** Fridge starters are fed once first. Null when no separate refresh is planned. */
  refresh: FeedingBreakdown | null;
};

/**
 * The ingredient summary in two groups: the levain you build ahead of time, and what is
 * added to the dough on mix day. The dough lines come straight from `buildIngredientRows`,
 * so they still add up to the dough weight (the levain row already holds its own flour and water).
 */
export type IngredientBreakdown = {
  levain: {
    /** Levain weight that goes into the dough. */
    grams: number;
    /** e.g. "100% hydration · Wheat Type 1050". */
    description: string;
    /** Null when the schedule skips starter prep, so only the in-dough amount is known. */
    plan: LevainBuildBreakdown | null;
  };
  dough: IngredientLine[];
  /** Whole-recipe flour and water, including what sits in the levain. */
  totals: { flourGrams: number; waterGrams: number };
};

/**
 * `scheduleInput` decides the levain build (build hours, fridge starter, buffer). Before a schedule
 * exists, as on the builder summary, pass nothing and the schedule defaults are used.
 */
export function buildIngredientBreakdown(
  recipeInput: RecipeInput,
  formula: RecipeFormula,
  scheduleInput?: ScheduleInput,
): IngredientBreakdown {
  const schedule = scheduleInput ?? createDefaultScheduleInput(recipeInput);

  return {
    levain: {
      grams: formula.levainGrams,
      description: `${recipeInput.levainHydrationPercent}% hydration · ${flourProfiles[recipeInput.levainFlourType].label}`,
      plan: schedule.includeStarterPrep ? buildLevainPlan(recipeInput, formula, schedule) : null,
    },
    dough: buildDoughLines(recipeInput, formula),
    totals: { flourGrams: formula.totalFlourGrams, waterGrams: formula.totalWaterGrams },
  };
}

function buildDoughLines(recipeInput: RecipeInput, formula: RecipeFormula): IngredientLine[] {
  const usedFlours = recipeInput.doughFlours.filter((entry) => entry.percent > 0);

  return buildIngredientRows(recipeInput, formula).map(([label, value]): IngredientLine => {
    const grams = Number(value);

    if (label === 'Added water') {
      return { kind: 'water', label: 'Water', grams };
    }
    if (label === 'Salt') {
      return { kind: 'salt', label: 'Salt', grams };
    }
    if (label === 'Levain') {
      return { kind: 'levain', label: 'Levain', grams, note: 'Built ahead, see above' };
    }

    // "Added flour" is the single-flour row; blend rows already carry the flour's own label.
    const flourLabel =
      label === 'Added flour' && usedFlours.length === 1 ? flourProfiles[usedFlours[0].flourType].label : label;
    return { kind: 'flour', label: formatFlourName(flourLabel), grams };
  });
}

function buildLevainPlan(
  recipeInput: RecipeInput,
  formula: RecipeFormula,
  schedule: ScheduleInput,
): LevainBuildBreakdown {
  const plan = planStarterPrep({
    buildHours: schedule.levainBuildHours,
    roomTemperatureCelsius: recipeInput.roomTemperatureCelsius,
    levainActivity: recipeInput.levainActivity,
    starterFromFridge: schedule.starterFromFridge,
  });
  const levainFlourLabel = flourProfiles[recipeInput.levainFlourType].label;
  const buildFeeding = calculateLevainBuildFeeding(formula, plan.levainBuildRatio, schedule.levainBufferPercent);

  return {
    build: toFeedingBreakdown(formatRatioLabel(plan.levainBuildRatio), buildFeeding, levainFlourLabel),
    buildHours: plan.levainBuildHours,
    bufferPercent: schedule.levainBufferPercent,
    refresh: plan.includeRefreshStep
      ? toFeedingBreakdown(
          formatRatioLabel(STARTER_REFRESH_RATIO),
          calculateStarterRefreshFeeding(),
          levainFlourLabel,
        )
      : null,
  };
}

function toFeedingBreakdown(ratioLabel: string, amounts: FeedingAmounts, flourLabel: string): FeedingBreakdown {
  return {
    ratioLabel,
    totalGrams: amounts.totalGrams,
    lines: [
      { kind: 'starter', label: 'Starter', grams: amounts.starterGrams },
      { kind: 'flour', label: 'Flour', grams: amounts.flourGrams, note: flourLabel },
      { kind: 'water', label: 'Water', grams: amounts.waterGrams },
    ],
  };
}

function formatFlourName(profileLabel: string): string {
  return /flour/i.test(profileLabel) ? profileLabel : `${profileLabel} flour`;
}
