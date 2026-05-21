import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from './defaults.ts';
import { scaleScheduleBakeParamsForDoughSize } from './scaleScheduleBakeParams.ts';

test('scaleScheduleBakeParamsForDoughSize updates bake temps and durations', () => {
  const smallRecipe = {
    ...defaultRecipeInput,
    finalDoughWeightGrams: 600,
    numberOfLoaves: 1,
  };
  const largeRecipe = {
    ...defaultRecipeInput,
    finalDoughWeightGrams: 1800,
    numberOfLoaves: 1,
  };

  const smallSchedule = createDefaultScheduleInput(smallRecipe);
  const largeSchedule = scaleScheduleBakeParamsForDoughSize(
    largeRecipe,
    createDefaultScheduleInput(largeRecipe),
  );

  assert.equal(smallSchedule.openBakeTempCelsius, 260);
  assert.equal(largeSchedule.openBakeTempCelsius, 245);
  assert.ok(largeSchedule.dutchOvenClosedMinutes > smallSchedule.dutchOvenClosedMinutes);
});
