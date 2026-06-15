import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { createDefaultScheduleInput } from './defaults.ts';
import {
  getAutolyseRecommendation,
  getAutolyseTimeAdvice,
  getColdRetardAssessment,
  getColdRetardAssessmentLevel,
  getProofingStyleAdvice,
  getTotalBakeMinutes,
} from './scheduleAdvice.ts';

test('getAutolyseRecommendation flags high hydration doughs', () => {
  const recommendation = getAutolyseRecommendation({
    ...defaultRecipeInput,
    hydrationPercent: 85,
  });

  assert.equal(recommendation.recommended, true);
  assert.match(recommendation.summary, /85%/);
});

test('getAutolyseTimeAdvice shortens rest for stiffer doughs', () => {
  const stiff = getAutolyseTimeAdvice({ ...defaultRecipeInput, hydrationPercent: 68 });
  const wet = getAutolyseTimeAdvice({ ...defaultRecipeInput, hydrationPercent: 85 });

  assert.match(stiff, /20–30/);
  assert.match(wet, /45–60/);
});

test('getProofingStyleAdvice mentions warm kitchens', () => {
  const warm = getProofingStyleAdvice(
    { ...defaultRecipeInput, roomTemperatureCelsius: 26 },
    'roomTemperature',
  );
  const cool = getProofingStyleAdvice(
    { ...defaultRecipeInput, roomTemperatureCelsius: 20 },
    'roomTemperature',
  );

  assert.match(warm, /warm kitchen/i);
  assert.match(cool, /same-day/i);
});

test('getColdRetardAssessment bands match duration', () => {
  assert.equal(getColdRetardAssessmentLevel(6), 'warning');
  assert.equal(getColdRetardAssessmentLevel(12), 'positive');
  assert.equal(getColdRetardAssessmentLevel(20), 'warning');
  assert.equal(getColdRetardAssessmentLevel(30), 'risk');
  assert.match(getColdRetardAssessment(12), /overnight/i);
});

test('getTotalBakeMinutes sums dutch oven and open bake durations', () => {
  const schedule = createDefaultScheduleInput(defaultRecipeInput);

  assert.equal(
    getTotalBakeMinutes({
      bakeMethod: 'dutchOven',
      dutchOvenClosedMinutes: schedule.dutchOvenClosedMinutes,
      dutchOvenLidOffMinutes: schedule.dutchOvenLidOffMinutes,
      dutchOvenOutOfPotMinutes: schedule.dutchOvenOutOfPotMinutes,
      openBakeMinutes: schedule.openBakeMinutes,
      finishMinutes: schedule.finishMinutes,
    }),
    schedule.dutchOvenClosedMinutes +
      schedule.dutchOvenLidOffMinutes +
      schedule.dutchOvenOutOfPotMinutes,
  );

  assert.equal(
    getTotalBakeMinutes({
      bakeMethod: 'open',
      dutchOvenClosedMinutes: 0,
      dutchOvenLidOffMinutes: 0,
      dutchOvenOutOfPotMinutes: 0,
      openBakeMinutes: 30,
      finishMinutes: 10,
    }),
    40,
  );
});
