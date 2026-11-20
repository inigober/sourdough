import { calculateRecipe } from '../recipe/calculateRecipe.ts';
import { getFlourIngredientRows } from '../recipe/flourBlend.ts';
import { flourProfiles } from '../recipe/flourProfiles.ts';
import type { FlourType, RecipeFormula, RecipeInput } from '../recipe/types.ts';
import {
  DEFAULT_LEVAIN_BUFFER_PERCENT,
  STARTER_REFRESH_RATIO,
  calculateLevainBuildFeeding,
  calculateStarterRefreshFeeding,
  formatRatioLabel,
  getDefaultLevainBuildHours,
  planStarterPrep,
  type FeedingAmounts,
} from '../schedule/levainPrep.ts';
import type { ScheduleInput, TimelineStep } from '../schedule/types.ts';

export type StepAmountRow = {
  label: string;
  grams: number;
  /** Last row of a feeding: the sum of the rows above it. */
  isTotal?: boolean;
};

/** What a baker weighs out for one bake-mode step. */
export type StepAmounts = {
  rows: StepAmountRow[];
  /** One line under the rows, e.g. why a levain build is a little bigger than the dough needs. */
  note?: string;
};

const MIX_STEP_IDS = new Set([
  'mix-levain',
  'mix-salt',
  // formatTimelineForDisplay merges a mix marker with its rest into one step.
  'mix-levain-rest-after-levain',
  'mix-salt-rest-after-salt',
]);

/**
 * Gram amounts for the steps where a baker weighs ingredients: the starter refresh, the levain
 * build, the autolyse and the mix steps. Null for every other step, and when the recipe cannot be
 * calculated, so the screen shows no amounts rather than wrong ones.
 */
export function getStepAmounts(
  stepId: string,
  recipeInput: RecipeInput,
  scheduleInput: ScheduleInput,
): StepAmounts | null {
  if (stepId === 'refresh-starter') {
    return {
      rows: buildFeedingRows(calculateStarterRefreshFeeding(), recipeInput.levainFlourType),
    };
  }

  const formula = tryCalculateRecipe(recipeInput);
  if (!formula) {
    return null;
  }

  if (stepId === 'build-levain') {
    return buildLevainBuildAmounts(recipeInput, scheduleInput, formula);
  }

  if (stepId === 'autolyse') {
    return { rows: buildFlourAndWaterRows(recipeInput, formula) };
  }

  if (MIX_STEP_IDS.has(stepId)) {
    return { rows: buildMixRows(stepId, recipeInput, scheduleInput, formula) };
  }

  return null;
}

/**
 * The step's one-line detail with the gram amounts taken out, because bake mode shows them in the
 * "Amounts" disclosure instead. The timeline detail itself stays unchanged: the schedule screens use it.
 */
export function getStepDetailWithoutAmounts(
  step: Pick<TimelineStep, 'id' | 'detail'>,
  hasAmounts: boolean,
): string | undefined {
  if (!hasAmounts) {
    return step.detail;
  }

  if (step.id === 'refresh-starter') {
    return `${formatRatioLabel(STARTER_REFRESH_RATIO)} feeding`;
  }

  if (MIX_STEP_IDS.has(step.id) && step.detail) {
    // buildTimeline writes "30g levain" / "20g salt" first, then optionally "· 45 min rest".
    const parts = step.detail.split(' · ').filter((part) => !/^\d+g (levain|salt)$/.test(part));
    return parts.length > 0 ? parts.join(' · ') : undefined;
  }

  return step.detail;
}

function buildLevainBuildAmounts(
  recipeInput: RecipeInput,
  scheduleInput: ScheduleInput,
  formula: RecipeFormula,
): StepAmounts {
  // Same inputs buildTimeline uses, so the ratio matches the step's label. Old saved schedules may lack these.
  const plan = planStarterPrep({
    buildHours: scheduleInput.levainBuildHours ?? getDefaultLevainBuildHours(),
    roomTemperatureCelsius: recipeInput.roomTemperatureCelsius,
    levainActivity: recipeInput.levainActivity,
    starterFromFridge: scheduleInput.starterFromFridge,
  });
  const bufferPercent = scheduleInput.levainBufferPercent ?? DEFAULT_LEVAIN_BUFFER_PERCENT;
  const feeding = calculateLevainBuildFeeding(formula, plan.levainBuildRatio, bufferPercent);

  return {
    rows: buildFeedingRows(feeding, recipeInput.levainFlourType),
    note:
      bufferPercent > 0
        ? `Includes ${bufferPercent}% extra for scrape and transfer.`
        : undefined,
  };
}

function buildFeedingRows(feeding: FeedingAmounts, levainFlourType: FlourType): StepAmountRow[] {
  return [
    { label: 'Seed starter', grams: feeding.starterGrams },
    { label: formatFlourName(flourProfiles[levainFlourType].label), grams: feeding.flourGrams },
    { label: 'Water', grams: feeding.waterGrams },
    { label: 'Total', grams: feeding.totalGrams, isTotal: true },
  ];
}

/** The flour added on top of the levain (one row per flour in the blend) plus the added water. */
function buildFlourAndWaterRows(recipeInput: RecipeInput, formula: RecipeFormula): StepAmountRow[] {
  const flourRows = getFlourIngredientRows(recipeInput.doughFlours, formula.addedFlourGrams).map(
    ([profileLabel, grams]): StepAmountRow => ({ label: formatFlourName(profileLabel), grams }),
  );

  return [...flourRows, { label: 'Water', grams: formula.addedWaterGrams }];
}

function buildMixRows(
  stepId: string,
  recipeInput: RecipeInput,
  scheduleInput: ScheduleInput,
  formula: RecipeFormula,
): StepAmountRow[] {
  const isLevainStep = stepId.startsWith('mix-levain');
  const isFirstMixStep = scheduleInput.saltAfterLevain ? isLevainStep : !isLevainStep;
  // Without an autolyse nothing else combines the flour and water, so the first mix step does.
  const rows =
    isFirstMixStep && !scheduleInput.autolyseEnabled
      ? buildFlourAndWaterRows(recipeInput, formula)
      : [];

  rows.push(
    isLevainStep
      ? { label: 'Levain', grams: formula.levainGrams }
      : { label: 'Salt', grams: formula.saltGrams },
  );

  return rows;
}

/** The recipe view names the flour ("Wheat Type 1050 flour"), not the bare profile label. */
function formatFlourName(profileLabel: string): string {
  return /flour/i.test(profileLabel) ? profileLabel : `${profileLabel} flour`;
}

function tryCalculateRecipe(recipeInput: RecipeInput): RecipeFormula | null {
  try {
    return calculateRecipe(recipeInput);
  } catch {
    return null;
  }
}
