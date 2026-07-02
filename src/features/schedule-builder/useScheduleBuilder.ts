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
import { getColdRetardHours, roundColdRetardHoursUp } from '../../lib/schedule/scheduleTiming.ts';
import { formatBakeDateLong, getBakeDateIso, getMixDateIso } from '../../lib/schedule/dates.ts';
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
};

export function useScheduleBuilder({ recipeInput, scheduleInput, recipeName }: UseScheduleBuilderOptions) {
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const autolyseAdvice = useMemo(() => getAutolyseRecommendation(recipeInput), [recipeInput]);
  const autolyseTimeAdvice = useMemo(() => getAutolyseTimeAdvice(recipeInput), [recipeInput]);
  const proofingAdvice = useMemo(
    () => getProofingStyleAdvice(recipeInput, scheduleInput.proofingStyle),
    [recipeInput, scheduleInput.proofingStyle],
  );
  const timeline = useMemo(() => {
    try {
      return formatTimelineForDisplay(buildTimeline(scheduleInput, recipeInput));
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
  const mixDateLabel = formatBakeDateLong(getMixDateIso(scheduleInput));
  const bakeDateLabel = formatBakeDateLong(getBakeDateIso(scheduleInput, recipeInput));
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
      mixDateLabel,
      bakeDateLabel,
      steps: timeline,
    });
    await copyToClipboard(text);
    setExportMessage('Schedule copied');
  }, [bakeDateLabel, mixDateLabel, recipeName, timeline]);

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

  return {
    exportMessage,
    autolyseAdvice,
    autolyseTimeAdvice,
    proofingAdvice,
    timeline,
    totalBakeMinutes,
    coldRetardHoursRounded,
    coldRetardAssessment,
    coldRetardAssessmentLevel,
    mixDateLabel,
    bakeDateLabel,
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
