import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { calculateRecipe } from '../recipe/calculateRecipe.ts';
import { buildTimeline } from './buildTimeline.ts';
import { createDefaultScheduleInput } from './defaults.ts';
import {
  calculateLevainBuildFeeding,
  calculateStarterRefreshFeeding,
  DEFAULT_LEVAIN_BUILD_HOURS,
  describeStarterPrepPlan,
  formatLevainBuildDetail,
  formatRatioLabel,
  getDefaultLevainBuildHours,
  getFridgeWakeEquivalentHours,
  getLevainBuildRatio,
  getStarterRefreshHours,
  planStarterPrep,
  SKIP_REFRESH_RATIO_THRESHOLD,
  STARTER_REFRESH_MIN_HOURS,
} from './levainPrep.ts';

test('levain build feeding uses a dynamic ratio with buffer', () => {
  const formula = calculateRecipe(defaultRecipeInput);
  const ratio = getLevainBuildRatio(12, defaultRecipeInput.roomTemperatureCelsius, defaultRecipeInput.levainActivity);
  const feeding = calculateLevainBuildFeeding(formula, ratio, 15);

  assert.ok(Math.abs(feeding.starterGrams + feeding.flourGrams + feeding.waterGrams - feeding.totalGrams) <= 1);
  assert.ok(feeding.totalGrams > formula.levainGrams);
});

test('longer builds use a higher feeding ratio at the same temperature', () => {
  const shortRatio = getLevainBuildRatio(6, 22, 'active');
  const longRatio = getLevainBuildRatio(12, 22, 'active');

  assert.ok(longRatio.flour > shortRatio.flour);
});

test('warmer room temperature increases feeding ratio for the same build time', () => {
  const coolRatio = getLevainBuildRatio(12, 18, 'active');
  const warmRatio = getLevainBuildRatio(12, 26, 'active');

  assert.ok(warmRatio.flour > coolRatio.flour);
});

test('fridge wake equivalent hours shrink as room temperature rises', () => {
  assert.equal(getFridgeWakeEquivalentHours(22), 3);
  assert.ok(getFridgeWakeEquivalentHours(18) > getFridgeWakeEquivalentHours(22));
  assert.ok(getFridgeWakeEquivalentHours(26) < getFridgeWakeEquivalentHours(22));
});

test('starter refresh hours account for fridge starter temperature', () => {
  assert.equal(getStarterRefreshHours(22), STARTER_REFRESH_MIN_HOURS);
  assert.ok(getStarterRefreshHours(18) > getStarterRefreshHours(22));
  assert.ok(getStarterRefreshHours(26) < getStarterRefreshHours(22));
});

test('folded fridge builds use a higher ratio in cooler rooms', () => {
  const coolPlan = planStarterPrep({
    buildHours: 14,
    roomTemperatureCelsius: 18,
    levainActivity: 'active',
    starterFromFridge: true,
  });
  const warmPlan = planStarterPrep({
    buildHours: 14,
    roomTemperatureCelsius: 26,
    levainActivity: 'active',
    starterFromFridge: true,
  });

  assert.ok(!coolPlan.includeRefreshStep);
  assert.ok(!warmPlan.includeRefreshStep);
  assert.ok(coolPlan.levainBuildRatio.flour >= warmPlan.levainBuildRatio.flour);
  assert.ok((coolPlan.fridgeWakeEquivalentHours ?? 0) > (warmPlan.fridgeWakeEquivalentHours ?? 0));
});

test('starter refresh feeding uses a 1:3:3 ratio', () => {
  const feeding = calculateStarterRefreshFeeding();
  assert.equal(feeding.starterGrams, 10);
  assert.equal(feeding.flourGrams, 30);
  assert.equal(feeding.waterGrams, 30);
});

test('high-ratio builds skip the separate fridge refresh step', () => {
  const plan = planStarterPrep({
    buildHours: 12,
    roomTemperatureCelsius: 22,
    levainActivity: 'active',
    starterFromFridge: true,
  });

  assert.equal(plan.includeRefreshStep, false);
  assert.ok(plan.refreshSkippedBecause);
  assert.ok(plan.levainBuildRatio.flour > SKIP_REFRESH_RATIO_THRESHOLD);
  assert.match(describeStarterPrepPlan(plan), /built into/);
});

test('formatLevainBuildDetail keeps copy short', () => {
  assert.equal(formatLevainBuildDetail('1:3:3', '09:00'), '1:3:3 feeding · ready for mix at 09:00');
  assert.equal(
    formatLevainBuildDetail('1:4:4', '09:00', 'high_ratio'),
    '1:4:4 feeding · includes fridge refresh · ready at 09:00',
  );
});

test('moderate-ratio builds keep a separate fridge refresh step', () => {
  const plan = planStarterPrep({
    buildHours: 7,
    roomTemperatureCelsius: 24,
    levainActivity: 'active',
    starterFromFridge: true,
  });

  assert.equal(plan.includeRefreshStep, true);
  assert.equal(plan.refreshSkippedBecause, undefined);
});

test('timeline includes refresh only when the prep plan calls for it', () => {
  const withRefresh = createDefaultScheduleInput(defaultRecipeInput);
  withRefresh.startTime = '09:00';
  withRefresh.starterFromFridge = true;
  withRefresh.levainBuildHours = 7;

  const refreshPlan = planStarterPrep({
    buildHours: 7,
    roomTemperatureCelsius: defaultRecipeInput.roomTemperatureCelsius,
    levainActivity: defaultRecipeInput.levainActivity,
    starterFromFridge: true,
  });
  const refreshTimeline = buildTimeline(withRefresh, defaultRecipeInput);
  assert.equal(refreshTimeline[0]?.id, 'refresh-starter');
  assert.match(refreshTimeline[0]?.label ?? '', new RegExp(`Refresh starter \\(~${refreshPlan.starterRefreshHours} h\\)`));
  assert.match(describeStarterPrepPlan(refreshPlan), /~4°C fridge starter/);

  const foldedTimeline = buildTimeline(createDefaultScheduleInput(defaultRecipeInput), defaultRecipeInput);
  assert.notEqual(foldedTimeline[0]?.id, 'refresh-starter');
  assert.equal(foldedTimeline[0]?.id, 'build-levain');
  assert.match(foldedTimeline[0]?.label ?? '', /fridge starter/);
});

test('default levain build time is 12 hours', () => {
  assert.equal(getDefaultLevainBuildHours(), DEFAULT_LEVAIN_BUILD_HOURS);
  assert.equal(createDefaultScheduleInput(defaultRecipeInput).levainBuildHours, 12);
  assert.equal(createDefaultScheduleInput(defaultRecipeInput).starterFromFridge, true);
});

test('ratio label is formatted for display', () => {
  assert.equal(formatRatioLabel({ starter: 1, flour: 8, water: 8 }), '1:8:8');
});
