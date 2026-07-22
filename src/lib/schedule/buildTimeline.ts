import { formatGrams } from '../../app/format.ts';
import {
  formatEndOfBulkRiseGuidance,
  formatPreShapeRiseGuidance,
  getBulkRiseTargets,
} from '../recipe/bulkRiseTargets.ts';
import type { RecipeFormula, RecipeInput } from '../recipe/types.ts';
import { calculateRecipe } from '../recipe/calculateRecipe.ts';
import { getSlapAndFoldDurationMinutes } from './defaults.ts';
import {
  calculateStarterRefreshFeeding,
  formatFeedingDetail,
  formatLevainBuildDetail,
  formatLevainBuildHoursLabel,
  formatRatioLabel,
  formatStarterRefreshLabel,
  getDefaultLevainBuildHours,
  planStarterPrep,
  STARTER_REFRESH_MIN_HOURS,
} from './levainPrep.ts';
import { formatOffsetDateTime } from './mixDateTime.ts';
import {
  getColdRetardHours,
  getBulkStartOffset,
  getLevainMixOffsetMinutes,
  roundColdRetardHoursUp,
} from './scheduleTiming.ts';
import type { ScheduleInput, TimelineStep } from './types.ts';

type MutableStep = {
  id: string;
  label: string;
  startOffsetMinutes: number;
  durationMinutes: number;
  detail?: string;
};

function tryCalculateRecipe(recipeInput: RecipeInput): RecipeFormula | null {
  try {
    return calculateRecipe(recipeInput);
  } catch {
    return null;
  }
}

export function buildTimeline(schedule: ScheduleInput, recipeInput: RecipeInput): TimelineStep[] {
  const riseTargets = getBulkRiseTargets(recipeInput);
  const formula = tryCalculateRecipe(recipeInput);
  const levainMixDetail = formula ? `${formatGrams(formula.levainGrams)} levain` : undefined;
  const saltMixDetail = formula ? `${formatGrams(formula.saltGrams)} salt` : undefined;
  const steps: MutableStep[] = [];
  let offset = 0;

  function appendMarker(id: string, label: string, detail?: string): void {
    steps.push({ id, label, startOffsetMinutes: offset, durationMinutes: 0, detail });
  }

  function appendStep(id: string, label: string, durationMinutes: number, detail?: string): void {
    if (durationMinutes <= 0) {
      return;
    }

    steps.push({ id, label, startOffsetMinutes: offset, durationMinutes, detail });
    offset += durationMinutes;
  }

  function appendAtOffset(
    startOffsetMinutes: number,
    id: string,
    label: string,
    durationMinutes: number,
    detail?: string,
  ): void {
    steps.push({ id, label, startOffsetMinutes, durationMinutes, detail });
  }

  function appendInstantAt(startOffsetMinutes: number, id: string, label: string, detail?: string): void {
    steps.push({ id, label, startOffsetMinutes, durationMinutes: 0, detail });
  }

  if (schedule.includeStarterPrep) {
    const levainBuildHours = schedule.levainBuildHours ?? getDefaultLevainBuildHours();
    const prepPlan = planStarterPrep({
      buildHours: levainBuildHours,
      roomTemperatureCelsius: recipeInput.roomTemperatureCelsius,
      levainActivity: recipeInput.levainActivity,
      starterFromFridge: schedule.starterFromFridge,
    });
    const levainBuildMinutes = Math.round(prepPlan.levainBuildHours * 60);
    const levainMixOffsetMinutes = getLevainMixOffsetMinutes(schedule);
    const levainBuildStartOffset = levainMixOffsetMinutes - levainBuildMinutes;
    const levainBuildHoursLabel = formatLevainBuildHoursLabel(prepPlan.levainBuildHours);
    const levainRatioLabel = formatRatioLabel(prepPlan.levainBuildRatio);
    const buildLabel = prepPlan.refreshSkippedBecause
      ? `Build levain from fridge starter (${levainBuildHoursLabel})`
      : `Build levain (${levainBuildHoursLabel})`;
    const levainMixTime = formatOffsetDateTime(schedule, levainMixOffsetMinutes).timeLabel;
    let levainDetail = formatLevainBuildDetail(levainRatioLabel, levainMixTime);

    try {
      calculateRecipe(recipeInput);
      levainDetail = formatLevainBuildDetail(
        levainRatioLabel,
        levainMixTime,
        prepPlan.refreshSkippedBecause,
      );
    } catch {
      levainDetail = formatLevainBuildDetail(levainRatioLabel, levainMixTime);
    }

    if (prepPlan.includeRefreshStep) {
      const refreshMinutes = STARTER_REFRESH_MIN_HOURS * 60;
      const refreshFeeding = calculateStarterRefreshFeeding();
      appendAtOffset(
        levainBuildStartOffset - refreshMinutes,
        'refresh-starter',
        formatStarterRefreshLabel(),
        refreshMinutes,
        formatFeedingDetail(refreshFeeding, '1:3:3'),
      );
    }

    appendAtOffset(
      levainBuildStartOffset,
      'build-levain',
      buildLabel,
      levainBuildMinutes,
      levainDetail,
    );
  }

  if (schedule.autolyseEnabled) {
    appendStep('autolyse', 'Autolyse', schedule.autolyseMinutes, 'Flour and water only');
  }

  const bulkStartOffset = getBulkStartOffset(schedule);
  let foldCursor = bulkStartOffset;

  if (schedule.saltAfterLevain) {
    appendMarker('mix-levain', 'Mix in levain', levainMixDetail);
    appendStep('rest-after-levain', 'Rest after mixing in levain', schedule.restAfterLevainMinutes);
    appendMarker('mix-salt', 'Mix in salt', saltMixDetail);
    appendStep('rest-after-salt', 'Rest after mixing in salt', schedule.restAfterSaltMinutes);
    foldCursor = offset;
  } else {
    appendMarker('mix-salt', 'Mix in salt', saltMixDetail);
    appendStep('rest-after-salt', 'Rest after mixing in salt', schedule.restAfterSaltMinutes);
    foldCursor = offset;
    appendMarker('mix-levain', 'Mix in levain', levainMixDetail);
    appendStep('rest-after-levain', 'Rest after mixing in levain', schedule.restAfterLevainMinutes);
  }

  const bulkTotalMinutes = Math.round(recipeInput.targetBulkHours * 60);
  const bulkEndOffset = bulkStartOffset + bulkTotalMinutes;
  const preShapeStartOffset = bulkEndOffset - schedule.preShapeMinutesBeforeBulkEnd;
  if (schedule.slapAndFolds > 0) {
    const slapDuration = getSlapAndFoldDurationMinutes(schedule.slapAndFolds);
    const totalSlapMinutes = slapDuration + schedule.restAfterSlapAndFoldMinutes;
    appendAtOffset(
      foldCursor,
      'slap-and-fold',
      'Slap and folds',
      totalSlapMinutes,
      `${schedule.slapAndFolds} slaps · ${schedule.restAfterSlapAndFoldMinutes} min rest after`,
    );
    foldCursor += totalSlapMinutes;
  }

  for (let index = 0; index < schedule.stretchAndFoldSets; index += 1) {
    const restStart = foldCursor;
    foldCursor += schedule.stretchAndFoldRestMinutes;

    if (foldCursor > preShapeStartOffset) {
      break;
    }

    const restDetail = `${schedule.stretchAndFoldRestMinutes} min rest · Set ${index + 1} of ${schedule.stretchAndFoldSets}`;
    appendAtOffset(
      restStart,
      `stretch-fold-${index + 1}`,
      `Stretch and fold ${index + 1}`,
      schedule.stretchAndFoldRestMinutes,
      restDetail,
    );
  }

  for (let index = 0; index < schedule.coilFoldSets; index += 1) {
    const restStart = foldCursor;
    foldCursor += schedule.coilFoldRestMinutes;

    if (foldCursor > preShapeStartOffset) {
      break;
    }

    const restDetail = `${schedule.coilFoldRestMinutes} min rest · Set ${index + 1} of ${schedule.coilFoldSets}`;
    appendAtOffset(
      restStart,
      `coil-fold-${index + 1}`,
      `Coil fold ${index + 1}`,
      schedule.coilFoldRestMinutes,
      restDetail,
    );
  }

  appendAtOffset(
    preShapeStartOffset,
    'pre-shape',
    'Pre-shape',
    Math.max(1, bulkEndOffset - preShapeStartOffset),
    formatPreShapeRiseGuidance(riseTargets),
  );
  appendInstantAt(bulkEndOffset, 'shape', 'Shape', formatEndOfBulkRiseGuidance(riseTargets));

  offset = bulkEndOffset;

  if (schedule.proofingStyle === 'cold') {
    const coldRetardHours = getColdRetardHours(schedule, recipeInput);
    const coldRetardHoursRounded = roundColdRetardHoursUp(coldRetardHours);
    appendStep(
      'cold-retard',
      'Cold retard',
      Math.round(coldRetardHours * 60),
      `~${coldRetardHoursRounded}h in the fridge`,
    );
  } else {
    appendStep(
      'room-proof',
      'Room-temperature proof',
      Math.round(schedule.roomProofHours * 60),
      `${schedule.roomProofHours}h at ${recipeInput.roomTemperatureCelsius}°C`,
    );
  }

  if (schedule.bakeMethod === 'dutchOven') {
    appendStep(
      'bake-closed',
      'Bake with lid on',
      schedule.dutchOvenClosedMinutes,
      `${schedule.dutchOvenClosedMinutes} min · ${schedule.openBakeTempCelsius}°C`,
    );
    appendStep(
      'bake-lid-off',
      'Bake with lid off',
      schedule.dutchOvenLidOffMinutes,
      `${schedule.dutchOvenLidOffMinutes} min · ${schedule.finishTempCelsius}°C`,
    );
    appendStep(
      'bake-out-of-pot',
      'Bake out of Dutch oven',
      schedule.dutchOvenOutOfPotMinutes,
      `${schedule.dutchOvenOutOfPotMinutes} min · ${schedule.finishTempCelsius}°C`,
    );
  } else {
    appendStep(
      'bake-open',
      'Bake at start temperature',
      schedule.openBakeMinutes,
      `${schedule.openBakeMinutes} min · ${schedule.openBakeTempCelsius}°C`,
    );
    appendStep(
      'bake-finish',
      'Finish bake',
      schedule.finishMinutes,
      `${schedule.finishMinutes} min · ${schedule.finishTempCelsius}°C`,
    );
  }

  return steps
    .sort((left, right) => left.startOffsetMinutes - right.startOffsetMinutes)
    .map((step) => {
      const start = formatOffsetDateTime(schedule, step.startOffsetMinutes);
      const end = formatOffsetDateTime(
        schedule,
        step.startOffsetMinutes + step.durationMinutes,
      );

      return {
        id: step.id,
        label: step.label,
        detail: step.detail,
        durationMinutes: step.durationMinutes,
        startOffsetMinutes: step.startOffsetMinutes,
        startTime: start.timeLabel,
        endTime: end.timeLabel,
        dateLabel: start.dateLabel ?? undefined,
      };
    });
}

export function formatTimelineForDisplay(steps: TimelineStep[]): TimelineStep[] {
  const displaySteps: TimelineStep[] = [];

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const nextStep = steps[index + 1];

    if (step.id === 'mix-levain' && nextStep?.id === 'rest-after-levain') {
      displaySteps.push(mergeSteps(step, nextStep, 'Mix in levain and rest'));
      index += 1;
      continue;
    }

    if (step.id === 'mix-salt' && nextStep?.id === 'rest-after-salt') {
      displaySteps.push(mergeSteps(step, nextStep, 'Mix in salt and rest'));
      index += 1;
      continue;
    }

    displaySteps.push(step);
  }

  return displaySteps;
}

function mergeSteps(first: TimelineStep, second: TimelineStep, label: string): TimelineStep {
  const restDetail =
    second.durationMinutes > 0 ? `${second.durationMinutes} min rest` : undefined;
  const detailParts = [first.detail, restDetail].filter(Boolean);
  const detail = detailParts.length > 0 ? detailParts.join(' · ') : undefined;

  return {
    id: `${first.id}-${second.id}`,
    label,
    detail,
    startTime: first.startTime,
    endTime: second.endTime,
    durationMinutes: first.durationMinutes + second.durationMinutes,
    startOffsetMinutes: first.startOffsetMinutes,
    dateLabel: first.dateLabel,
  };
}
