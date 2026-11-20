import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { recipeTemplates } from '../recipe/templates.ts';
import type { RecipeInput } from '../recipe/types.ts';
import { buildTimeline } from './buildTimeline.ts';
import { createDefaultScheduleInput } from './defaults.ts';
import {
  CUSTOM_PLAN_OPTION,
  findMatchingSchedulePresetId,
  getSelectedPlanOptionId,
  getSchedulePresetChanges,
  getSchedulePresetPatch,
  hasEditedScheduleValues,
  SCHEDULE_PRESET_FIELDS,
  SCHEDULE_PRESET_INFO,
  type SchedulePresetId,
} from './presets.ts';
import { getMixDayBakeOffset } from './relativeDays.ts';
import { getColdRetardHours } from './scheduleTiming.ts';
import type { ScheduleInput } from './types.ts';

const presetIds = SCHEDULE_PRESET_INFO.map((preset) => preset.id);

// A spread of "typical" recipes: the app default, every built-in template, and short/long bulks.
const typicalRecipes: { name: string; recipe: RecipeInput }[] = [
  { name: 'default 80% / 8h bulk', recipe: defaultRecipeInput },
  ...recipeTemplates.map((template) => ({ name: template.name, recipe: template.recipeInput })),
  ...[3, 4, 5, 6, 10].map((hours) => ({
    name: `70% / ${hours}h bulk`,
    recipe: { ...defaultRecipeInput, hydrationPercent: 70, targetBulkHours: hours },
  })),
  ...[3, 5, 8, 10].map((hours) => ({
    name: `85% / ${hours}h bulk`,
    recipe: { ...defaultRecipeInput, hydrationPercent: 85, targetBulkHours: hours },
  })),
];

function applyPreset(presetId: SchedulePresetId, recipe: RecipeInput): ScheduleInput {
  return { ...createDefaultScheduleInput(recipe), ...getSchedulePresetPatch(presetId, recipe) };
}

test('presets only set process-shape fields, never bake, starter or date fields', () => {
  for (const presetId of presetIds) {
    const patch = getSchedulePresetPatch(presetId, defaultRecipeInput);

    for (const key of Object.keys(patch)) {
      assert.ok(
        (SCHEDULE_PRESET_FIELDS as readonly string[]).includes(key),
        `${presetId} sets unexpected field ${key}`,
      );
    }

    assert.equal('mixDate' in patch, false);
  }
});

test('simple overnight uses the fridge for about 14 hours and mixes the day before', () => {
  for (const { name, recipe } of typicalRecipes) {
    const schedule = applyPreset('simpleOvernight', recipe);
    const retardHours = getColdRetardHours(schedule, recipe);
    const timeline = buildTimeline(schedule, recipe);

    assert.equal(schedule.proofingStyle, 'cold', name);
    assert.equal(schedule.desiredBakeTime, '08:00', name);
    // Start time is rounded to 15 minutes, so the fridge time lands within a quarter hour of 14h.
    assert.ok(retardHours >= 13.7 && retardHours <= 14.3, `${name}: ${retardHours}h in the fridge`);
    assert.equal(getMixDayBakeOffset(timeline), -1, name);
    assert.ok(timeline.some((step) => step.id === 'cold-retard'), name);
  }
});

test('weekend deep ferment is longer than overnight but stays under the 22h risk threshold', () => {
  for (const { name, recipe } of typicalRecipes) {
    const overnightHours = getColdRetardHours(applyPreset('simpleOvernight', recipe), recipe);
    const schedule = applyPreset('weekendDeepFerment', recipe);
    const retardHours = getColdRetardHours(schedule, recipe);

    assert.ok(retardHours >= 19.7 && retardHours <= 20.3, `${name}: ${retardHours}h in the fridge`);
    assert.ok(retardHours > overnightHours, name);
    assert.equal(schedule.desiredBakeTime, '12:00', name);
    assert.equal(schedule.autolyseEnabled, true, name);
    assert.equal(schedule.autolyseMinutes, 60, name);
  }
});

test('same day proofs at room temperature and bakes on the day it is mixed', () => {
  for (const { name, recipe } of typicalRecipes) {
    const schedule = applyPreset('sameDay', recipe);
    const timeline = buildTimeline(schedule, recipe);
    const mixAndLaterSteps = timeline.filter((step) => step.startOffsetMinutes >= 0);

    assert.equal(schedule.proofingStyle, 'roomTemperature', name);
    assert.equal(schedule.startTime, '07:00', name);
    assert.ok(timeline.some((step) => step.id === 'room-proof'), name);
    assert.equal(timeline.some((step) => step.id === 'cold-retard'), false, name);
    assert.equal(getMixDayBakeOffset(timeline), 0, name);
    assert.ok(
      mixAndLaterSteps.every((step) => step.bakeDayOffset === 0),
      `${name}: every step from mix onwards should be on bake day`,
    );
  }
});

test('every preset builds a sorted timeline with folds before pre-shape', () => {
  for (const { name, recipe } of typicalRecipes) {
    for (const presetId of presetIds) {
      const timeline = buildTimeline(applyPreset(presetId, recipe), recipe);
      const ids = timeline.map((step) => step.id);

      assert.ok(timeline.length > 8, `${name} / ${presetId}`);
      assert.ok(ids.includes('pre-shape') && ids.includes('shape'), `${name} / ${presetId}`);
      assert.ok(ids.indexOf('pre-shape') < ids.indexOf('shape'), `${name} / ${presetId}`);
      assert.ok(ids.includes('stretch-fold-1'), `${name} / ${presetId}`);

      for (let index = 1; index < timeline.length; index += 1) {
        assert.ok(
          timeline[index].startOffsetMinutes >= timeline[index - 1].startOffsetMinutes,
          `${name} / ${presetId}: steps must stay sorted`,
        );
      }
    }
  }
});

test('simple presets use stretch and folds only; the deep ferment keeps the full fold plan', () => {
  const wetRecipe = { ...defaultRecipeInput, hydrationPercent: 85 };

  for (const presetId of ['simpleOvernight', 'sameDay'] as const) {
    const patch = getSchedulePresetPatch(presetId, wetRecipe);
    assert.equal(patch.slapAndFolds, 0);
    assert.equal(patch.coilFoldSets, 0);
    assert.equal(patch.stretchAndFoldSets, 4);
  }

  const deep = getSchedulePresetPatch('weekendDeepFerment', wetRecipe);
  assert.equal(deep.slapAndFolds, 50);
  assert.equal(deep.coilFoldSets, 3);

  const stiffRecipe = { ...defaultRecipeInput, hydrationPercent: 70 };
  assert.equal(getSchedulePresetPatch('simpleOvernight', stiffRecipe).stretchAndFoldSets, 2);
});

test('each preset matches itself and none of the others', () => {
  for (const { name, recipe } of typicalRecipes) {
    for (const presetId of presetIds) {
      const schedule = applyPreset(presetId, recipe);
      assert.equal(findMatchingSchedulePresetId(schedule, recipe), presetId, `${name} / ${presetId}`);
    }
  }
});

test('a schedule built from a preset matches it, and one edit turns it into Custom', () => {
  const schedule = applyPreset('simpleOvernight', defaultRecipeInput);
  assert.equal(findMatchingSchedulePresetId(schedule, defaultRecipeInput), 'simpleOvernight');
  assert.deepEqual(getSchedulePresetChanges(schedule, 'simpleOvernight', defaultRecipeInput), []);

  const edited = { ...schedule, stretchAndFoldRestMinutes: 45 };
  assert.equal(findMatchingSchedulePresetId(edited, defaultRecipeInput), null);
  assert.equal(hasEditedScheduleValues(edited, defaultRecipeInput), true);
});

test('matching ignores oven, starter and date settings', () => {
  const schedule = {
    ...applyPreset('simpleOvernight', defaultRecipeInput),
    mixDate: '2026-03-04',
    bakeMethod: 'open' as const,
    openBakeTempCelsius: 270,
    includeStarterPrep: false,
    levainBuildHours: 12,
  };

  assert.equal(findMatchingSchedulePresetId(schedule, defaultRecipeInput), 'simpleOvernight');
});

test('matching ignores hidden fields that do not affect the timeline', () => {
  const stiffRecipe = { ...defaultRecipeInput, hydrationPercent: 70 };
  const overnight = applyPreset('simpleOvernight', stiffRecipe);
  // At 70% hydration autolyse is off, so its minutes are neither shown nor used.
  assert.equal(overnight.autolyseEnabled, false);
  assert.equal(
    findMatchingSchedulePresetId(
      { ...overnight, autolyseMinutes: 20, roomProofHours: 3, restAfterSlapAndFoldMinutes: 10 },
      stiffRecipe,
    ),
    'simpleOvernight',
  );

  const sameDay = applyPreset('sameDay', defaultRecipeInput);
  assert.equal(
    findMatchingSchedulePresetId({ ...sameDay, desiredBakeTime: '23:00' }, defaultRecipeInput),
    'sameDay',
  );
});

test('room proof hours are compared with a tolerance', () => {
  const sameDay = applyPreset('sameDay', defaultRecipeInput);
  assert.equal(
    findMatchingSchedulePresetId(
      { ...sameDay, roomProofHours: sameDay.roomProofHours + 1e-9 },
      defaultRecipeInput,
    ),
    'sameDay',
  );
  assert.equal(
    findMatchingSchedulePresetId(
      { ...sameDay, roomProofHours: sameDay.roomProofHours + 0.25 },
      defaultRecipeInput,
    ),
    null,
  );
});

test('untouched starting values are not "edited", but any change to a preset field is', () => {
  for (const { name, recipe } of typicalRecipes) {
    assert.equal(hasEditedScheduleValues(createDefaultScheduleInput(recipe), recipe), false, name);
  }

  const starting = createDefaultScheduleInput(defaultRecipeInput);
  assert.equal(hasEditedScheduleValues({ ...starting, startTime: '10:30' }, defaultRecipeInput), true);
  assert.equal(
    hasEditedScheduleValues({ ...starting, preShapeMinutesBeforeBulkEnd: 45 }, defaultRecipeInput),
    true,
  );
  // Bake settings are not part of a preset, so changing them does not count as editing the plan.
  assert.equal(hasEditedScheduleValues({ ...starting, openBakeTempCelsius: 270 }, defaultRecipeInput), false);
});

test('changes list exactly the fields a preset would overwrite', () => {
  const starting = { ...createDefaultScheduleInput(defaultRecipeInput), startTime: '10:00' };
  const changes = getSchedulePresetChanges(starting, 'sameDay', defaultRecipeInput);
  const fields = changes.map((change) => change.field);
  const startTimeChange = changes.find((change) => change.field === 'startTime');

  assert.ok(fields.includes('proofingStyle'));
  assert.equal(startTimeChange?.from, '10:00');
  assert.equal(startTimeChange?.to, '07:00');
  assert.equal(fields.includes('desiredBakeTime'), false);
});

test('legacy schedules with a saved calendar date still match by process fields', () => {
  const legacy = { ...applyPreset('weekendDeepFerment', defaultRecipeInput), mixDate: '2025-08-18' };
  assert.equal(findMatchingSchedulePresetId(legacy, defaultRecipeInput), 'weekendDeepFerment');
});

test('the selected plan option is the matching preset, or Custom', () => {
  assert.equal(getSelectedPlanOptionId('sameDay', false), 'sameDay');
  // No preset matches: Custom.
  assert.equal(getSelectedPlanOptionId(null, false), 'custom');
  // Chosen on purpose (or editing) stays Custom even when the values equal a preset.
  assert.equal(getSelectedPlanOptionId('sameDay', true), 'custom');
  assert.equal(getSelectedPlanOptionId(null, true), 'custom');
});

test('Custom is not a preset and has copy for the picker', () => {
  assert.equal(presetIds.includes('custom' as SchedulePresetId), false);
  assert.ok(CUSTOM_PLAN_OPTION.label.length > 0);
  assert.ok(CUSTOM_PLAN_OPTION.description.length > 0);
});
