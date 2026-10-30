import { formatGrams } from '../../app/format.ts';
import { buildTimeline, formatTimelineForDisplay } from '../schedule/buildTimeline.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import {
  STARTER_REFRESH_RATIO,
  calculateLevainBuildFeeding,
  calculateStarterRefreshFeeding,
  formatFeedingDetail,
  formatLevainBuildAmounts,
  formatRatioLabel,
  planStarterPrep,
} from '../schedule/levainPrep.ts';
import {
  formatMixDaySummary,
  groupStepsByBakeDay,
  type TimelineDayGroup,
} from '../schedule/relativeDays.ts';
import type { ScheduleInput } from '../schedule/types.ts';
import { calculateRecipe } from './calculateRecipe.ts';
import { flourProfiles } from './flourProfiles.ts';
import { buildIngredientRows, type IngredientRow } from './formatIngredients.ts';
import type { RecipeFormula, RecipeInput } from './types.ts';

export type OverviewStep = {
  id: string;
  time: string;
  label: string;
  duration: string | null;
};

export type OverviewDay = {
  label: string;
  steps: OverviewStep[];
};

export type RecipeScheduleOverview = {
  startTime: string;
  mixDaySummary: string;
  days: OverviewDay[];
};

/** Everything the read-only recipe view shows, computed from a saved recipe. */
export type RecipeOverview = {
  doughSummary: string;
  ingredientRows: IngredientRow[];
  levainRows: IngredientRow[];
  /** Null when the recipe was saved without a schedule. */
  schedule: RecipeScheduleOverview | null;
};

export function buildRecipeOverview(
  recipeInput: RecipeInput,
  scheduleInput: ScheduleInput | undefined,
): RecipeOverview {
  const formula = tryCalculateRecipe(recipeInput);

  return {
    doughSummary: formatDoughSummary(recipeInput),
    ingredientRows: formula ? buildIngredientRows(recipeInput, formula) : [],
    levainRows: formula
      ? buildLevainRows(recipeInput, formula, scheduleInput ?? createDefaultScheduleInput(recipeInput))
      : [],
    schedule: scheduleInput ? buildScheduleOverview(recipeInput, scheduleInput) : null,
  };
}

export function formatStepDuration(durationMinutes: number): string | null {
  if (durationMinutes <= 0) {
    return null;
  }

  if (durationMinutes < 60) {
    return `${durationMinutes} min`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

function formatDoughSummary(recipeInput: RecipeInput): string {
  const loaves = `${recipeInput.numberOfLoaves} loaf${recipeInput.numberOfLoaves === 1 ? '' : 'es'}`;

  return [
    `${recipeInput.finalDoughWeightGrams}g`,
    loaves,
    `${recipeInput.hydrationPercent}% hydration`,
    `${recipeInput.saltPercent}% salt`,
  ].join(' · ');
}

function buildLevainRows(
  recipeInput: RecipeInput,
  formula: RecipeFormula,
  scheduleInput: ScheduleInput,
): IngredientRow[] {
  const rows: IngredientRow[] = [
    ['Levain in the dough', formula.levainGrams],
    [
      'Levain type',
      `${recipeInput.levainHydrationPercent}% hydration · ${flourProfiles[recipeInput.levainFlourType].label}`,
    ],
  ];

  if (!scheduleInput.includeStarterPrep) {
    return rows;
  }

  const plan = planStarterPrep({
    buildHours: scheduleInput.levainBuildHours,
    roomTemperatureCelsius: recipeInput.roomTemperatureCelsius,
    levainActivity: recipeInput.levainActivity,
    starterFromFridge: scheduleInput.starterFromFridge,
  });

  if (plan.includeRefreshStep) {
    rows.push([
      'Refresh starter first',
      formatFeedingDetail(calculateStarterRefreshFeeding(), formatRatioLabel(STARTER_REFRESH_RATIO)),
    ]);
  }

  const buildFeeding = calculateLevainBuildFeeding(
    formula,
    plan.levainBuildRatio,
    scheduleInput.levainBufferPercent,
  );
  rows.push([
    `Build levain (${formatRatioLabel(plan.levainBuildRatio)})`,
    formatLevainBuildAmounts(buildFeeding),
  ]);
  rows.push([
    'Build time',
    `${plan.levainBuildHours} h · includes ${scheduleInput.levainBufferPercent}% extra for scrape and transfer`,
  ]);

  return rows;
}

function buildScheduleOverview(
  recipeInput: RecipeInput,
  scheduleInput: ScheduleInput,
): RecipeScheduleOverview {
  const steps = tryBuildTimeline(recipeInput, scheduleInput);
  const days: TimelineDayGroup[] = groupStepsByBakeDay(steps);

  return {
    startTime: scheduleInput.startTime,
    mixDaySummary: formatMixDaySummary(steps),
    days: days.map((day) => ({
      label: day.label,
      steps: day.steps.map((step) => ({
        id: step.id,
        time: step.startTime,
        label: step.label,
        duration: formatStepDuration(step.durationMinutes),
      })),
    })),
  };
}

function tryBuildTimeline(recipeInput: RecipeInput, scheduleInput: ScheduleInput) {
  try {
    return formatTimelineForDisplay(buildTimeline(scheduleInput, recipeInput));
  } catch {
    return [];
  }
}

function tryCalculateRecipe(recipeInput: RecipeInput): RecipeFormula | null {
  try {
    return calculateRecipe(recipeInput);
  } catch {
    return null;
  }
}
