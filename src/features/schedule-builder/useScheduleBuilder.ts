import { useCallback, useEffect, useMemo, useState } from 'react';

import { buildTimeline, formatTimelineForDisplay } from '../../lib/schedule/buildTimeline.ts';
import { calculateRecipe } from '../../lib/recipe/calculateRecipe.ts';
import { buildIngredientRows, formatIngredientListAsText } from '../../lib/recipe/formatIngredients.ts';
import {
  getAutolyseRecommendation,
  getAutolyseTimeAdvice,
  getColdRetardAssessment,
  getColdRetardAssessmentLevel,
  getProofingStyleAdvice,
  getTotalBakeMinutes,
} from '../../lib/schedule/scheduleAdvice.ts';
import {
  findMatchingSchedulePresetId,
  getSchedulePresetChanges,
  getSchedulePresetPatch,
  hasEditedScheduleValues,
  SCHEDULE_PRESET_INFO,
  type SchedulePresetId,
} from '../../lib/schedule/presets.ts';
import { getColdRetardHours, roundColdRetardHoursUp } from '../../lib/schedule/scheduleTiming.ts';
import {
  formatBakeDayLabel,
  formatMixAndBakeSentence,
  getMixDayBakeOffset,
  withBakeDayLabels,
} from '../../lib/schedule/relativeDays.ts';
import type { RecipeInput } from '../../lib/recipe/types.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import {
  describeStarterPrepPlan,
  formatLevainBuildAmounts,
  formatRatioLabel,
  calculateLevainBuildFeeding,
  planStarterPrep,
} from '../../lib/schedule/levainPrep.ts';
import { formatRecipeExportJson, formatScheduleAsText } from '../../lib/schedule/exportSchedule.ts';
import { copyToClipboard } from '../../lib/ui/copyToClipboard.ts';

type UseScheduleBuilderOptions = {
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  recipeName: string;
  onScheduleChange: (patch: Partial<ScheduleInput>) => void;
};

export function useScheduleBuilder({
  recipeInput,
  scheduleInput,
  recipeName,
  onScheduleChange,
}: UseScheduleBuilderOptions) {
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [pendingPresetId, setPendingPresetId] = useState<SchedulePresetId | null>(null);

  const autolyseAdvice = useMemo(() => getAutolyseRecommendation(recipeInput), [recipeInput]);
  const autolyseTimeAdvice = useMemo(() => getAutolyseTimeAdvice(recipeInput), [recipeInput]);
  const proofingAdvice = useMemo(
    () => getProofingStyleAdvice(recipeInput, scheduleInput.proofingStyle),
    [recipeInput, scheduleInput.proofingStyle],
  );
  const timeline = useMemo(() => {
    try {
      return withBakeDayLabels(formatTimelineForDisplay(buildTimeline(scheduleInput, recipeInput)));
    } catch {
      return [];
    }
  }, [scheduleInput, recipeInput]);
  const totalBakeMinutes = getTotalBakeMinutes(scheduleInput);
  const coldRetardHours = useMemo(
    () => getColdRetardHours(scheduleInput, recipeInput),
    [scheduleInput, recipeInput],
  );
  const coldRetardHoursRounded = roundColdRetardHoursUp(coldRetardHours);
  const coldRetardAssessment = useMemo(
    () => getColdRetardAssessment(coldRetardHours),
    [coldRetardHours],
  );
  const coldRetardAssessmentLevel = useMemo(
    () => getColdRetardAssessmentLevel(coldRetardHours),
    [coldRetardHours],
  );
  const mixDayOffset = getMixDayBakeOffset(timeline) ?? 0;
  const mixDayLabel = formatBakeDayLabel(mixDayOffset);
  const bakeDayLabel = formatBakeDayLabel(0);
  const mixAndBakeSentence = formatMixAndBakeSentence(mixDayOffset);
  const formula = useMemo(() => {
    try {
      return calculateRecipe(recipeInput);
    } catch {
      return null;
    }
  }, [recipeInput]);
  const ingredientRows = useMemo(
    () => (formula ? buildIngredientRows(recipeInput, formula) : []),
    [formula, recipeInput],
  );
  const starterPrepPlan = useMemo(
    () =>
      planStarterPrep({
        buildHours: scheduleInput.levainBuildHours,
        roomTemperatureCelsius: recipeInput.roomTemperatureCelsius,
        levainActivity: recipeInput.levainActivity,
        starterFromFridge: scheduleInput.starterFromFridge,
      }),
    [
      scheduleInput.levainBuildHours,
      scheduleInput.starterFromFridge,
      recipeInput.levainActivity,
      recipeInput.roomTemperatureCelsius,
    ],
  );
  const levainBuildRatioLabel = formatRatioLabel(starterPrepPlan.levainBuildRatio);
  const starterPrepPlanDescription = describeStarterPrepPlan(starterPrepPlan);
  const levainBuildAmountsLabel = useMemo(() => {
    if (!formula) {
      return null;
    }

    const feeding = calculateLevainBuildFeeding(
      formula,
      starterPrepPlan.levainBuildRatio,
      scheduleInput.levainBufferPercent,
    );
    return formatLevainBuildAmounts(feeding);
  }, [formula, scheduleInput.levainBufferPercent, starterPrepPlan.levainBuildRatio]);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    if (!exportMessage) {
      return;
    }

    const timer = window.setTimeout(() => setExportMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [exportMessage]);

  const copyScheduleText = useCallback(async (): Promise<void> => {
    const text = formatScheduleAsText({
      recipeName,
      mixDateLabel: mixDayLabel,
      bakeDateLabel: bakeDayLabel,
      steps: timeline,
    });
    await copyToClipboard(text);
    setExportMessage('Schedule copied');
  }, [bakeDayLabel, mixDayLabel, recipeName, timeline]);

  const copyIngredientList = useCallback(async (): Promise<void> => {
    if (!formula) {
      return;
    }

    const text = formatIngredientListAsText({
      recipeName,
      rows: ingredientRows,
    });
    await copyToClipboard(text);
    setExportMessage('Ingredient list copied');
  }, [formula, ingredientRows, recipeName]);

  const copyRecipeJson = useCallback(async (): Promise<void> => {
    const json = formatRecipeExportJson({
      recipeName,
      recipeInput,
      scheduleInput,
      timeline,
    });
    await copyToClipboard(json);
    setExportMessage('Recipe JSON copied');
  }, [recipeInput, recipeName, scheduleInput, timeline]);

  const matchedPresetId = useMemo(
    () => findMatchingSchedulePresetId(scheduleInput, recipeInput),
    [scheduleInput, recipeInput],
  );

  const applyPreset = useCallback(
    (presetId: SchedulePresetId): void => {
      onScheduleChange(getSchedulePresetPatch(presetId, recipeInput));
    },
    [onScheduleChange, recipeInput],
  );

  // Choosing a preset never overwrites silently: if the user has changed the plan by hand, ask first.
  const choosePreset = useCallback(
    (presetId: SchedulePresetId): void => {
      if (!hasEditedScheduleValues(scheduleInput, recipeInput)) {
        applyPreset(presetId);
        return;
      }

      setPendingPresetId(presetId);
    },
    [applyPreset, recipeInput, scheduleInput],
  );

  const pendingPreset = useMemo(() => {
    const info = SCHEDULE_PRESET_INFO.find((preset) => preset.id === pendingPresetId);
    if (!info) {
      return null;
    }

    return {
      info,
      changes: getSchedulePresetChanges(scheduleInput, info.id, recipeInput),
    };
  }, [pendingPresetId, recipeInput, scheduleInput]);

  const confirmPendingPreset = useCallback((): void => {
    if (pendingPresetId) {
      applyPreset(pendingPresetId);
    }
    setPendingPresetId(null);
  }, [applyPreset, pendingPresetId]);

  const cancelPendingPreset = useCallback((): void => setPendingPresetId(null), []);

  return {
    exportMessage,
    matchedPresetId,
    pendingPreset,
    choosePreset,
    confirmPendingPreset,
    cancelPendingPreset,
    autolyseAdvice,
    autolyseTimeAdvice,
    proofingAdvice,
    timeline,
    totalBakeMinutes,
    coldRetardHoursRounded,
    coldRetardAssessment,
    coldRetardAssessmentLevel,
    mixAndBakeSentence,
    formula,
    ingredientRows,
    levainBuildRatioLabel,
    levainBuildAmountsLabel,
    starterPrepPlanDescription,
    copyScheduleText,
    copyIngredientList,
    copyRecipeJson,
  };
}
