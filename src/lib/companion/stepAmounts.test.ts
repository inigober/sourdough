import assert from 'node:assert/strict';
import test from 'node:test';

import { createFlourBlendEntry } from '../recipe/flourBlend.ts';
import { calculateRecipe } from '../recipe/calculateRecipe.ts';
import { defaultRecipeInput } from '../recipe/defaults.ts';
import type { RecipeInput } from '../recipe/types.ts';
import { buildTimeline, formatTimelineForDisplay } from '../schedule/buildTimeline.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import type { ScheduleInput } from '../schedule/types.ts';
import { getStepAmounts, getStepDetailWithoutAmounts } from './stepAmounts.ts';

const formula = calculateRecipe(defaultRecipeInput);

function scheduleWith(overrides: Partial<ScheduleInput>): ScheduleInput {
  return { ...createDefaultScheduleInput(defaultRecipeInput), ...overrides };
}

function rowGrams(amounts: ReturnType<typeof getStepAmounts>, label: string): number | undefined {
  return amounts?.rows.find((row) => row.label === label)?.grams;
}

function rowLabels(amounts: ReturnType<typeof getStepAmounts>): string[] | undefined {
  return amounts?.rows.map((row) => row.label);
}

test('starter refresh lists seed starter, flour and water of the 1:3:3 feeding', () => {
  const amounts = getStepAmounts('refresh-starter', defaultRecipeInput, scheduleWith({}));

  assert.ok(amounts);
  assert.deepEqual(
    amounts.rows.map((row) => [row.label, row.grams]),
    [
      ['Seed starter', 10],
      ['Wheat Type 1050 flour', 30],
      ['Water', 30],
      ['Total', 70],
    ],
  );
  assert.equal(amounts.rows.at(-1)?.isTotal, true);
});

test('levain build covers the dough levain plus the buffer, split by the plan ratio', () => {
  const schedule = scheduleWith({ levainBufferPercent: 15, levainBuildHours: 12 });
  const amounts = getStepAmounts('build-levain', defaultRecipeInput, schedule);

  assert.ok(amounts);
  const total = rowGrams(amounts, 'Total') ?? 0;
  assert.equal(total, Math.round(formula.levainGrams * 1.15));
  const parts = ['Seed starter', 'Wheat Type 1050 flour', 'Water'].map(
    (label) => rowGrams(amounts, label) ?? 0,
  );
  // Each part is rounded on its own, so the sum can be a gram or two off the total.
  assert.ok(Math.abs(parts.reduce((sum, grams) => sum + grams, 0) - total) <= 2);
  assert.equal(amounts.note, 'Includes 15% extra for scrape and transfer.');
});

test('levain build has no buffer note when the buffer is zero', () => {
  const amounts = getStepAmounts(
    'build-levain',
    defaultRecipeInput,
    scheduleWith({ levainBufferPercent: 0 }),
  );

  assert.equal(amounts?.note, undefined);
  assert.equal(rowGrams(amounts, 'Total'), Math.round(formula.levainGrams));
});

test('levain build tolerates an older schedule without build hours or buffer', () => {
  const oldSchedule: Partial<ScheduleInput> = scheduleWith({});
  delete oldSchedule.levainBuildHours;
  delete oldSchedule.levainBufferPercent;

  const amounts = getStepAmounts('build-levain', defaultRecipeInput, oldSchedule as ScheduleInput);

  assert.ok(amounts);
  assert.ok((rowGrams(amounts, 'Total') ?? 0) > 0);
});

test('autolyse lists each flour of the blend and the added water, without levain or salt', () => {
  const blend: RecipeInput = {
    ...defaultRecipeInput,
    doughFlours: [createFlourBlendEntry('wheatType1050', 70), createFlourBlendEntry('wholeRye', 30)],
  };
  const blendFormula = calculateRecipe(blend);
  const amounts = getStepAmounts('autolyse', blend, scheduleWith({ autolyseEnabled: true }));

  assert.deepEqual(rowLabels(amounts), ['Wheat Type 1050 flour', 'Whole rye flour', 'Water']);
  assert.equal(rowGrams(amounts, 'Water'), blendFormula.addedWaterGrams);
});

test('autolyse names a single flour instead of "Added flour"', () => {
  const amounts = getStepAmounts(
    'autolyse',
    defaultRecipeInput,
    scheduleWith({ autolyseEnabled: true }),
  );

  assert.equal(rowGrams(amounts, 'Wheat Type 1050 flour'), Math.round(formula.addedFlourGrams));
});

test('mix steps show levain or salt only when an autolyse already combined flour and water', () => {
  const schedule = scheduleWith({ autolyseEnabled: true, saltAfterLevain: true });

  assert.deepEqual(getStepAmounts('mix-levain', defaultRecipeInput, schedule)?.rows, [
    { label: 'Levain', grams: formula.levainGrams },
  ]);
  assert.deepEqual(getStepAmounts('mix-salt', defaultRecipeInput, schedule)?.rows, [
    { label: 'Salt', grams: formula.saltGrams },
  ]);
});

test('without an autolyse the first mix step also lists the flour and water', () => {
  const levainFirst = scheduleWith({ autolyseEnabled: false, saltAfterLevain: true });
  const saltFirst = scheduleWith({ autolyseEnabled: false, saltAfterLevain: false });

  assert.deepEqual(rowLabels(getStepAmounts('mix-levain', defaultRecipeInput, levainFirst)), [
    'Wheat Type 1050 flour',
    'Water',
    'Levain',
  ]);
  assert.deepEqual(rowLabels(getStepAmounts('mix-salt', defaultRecipeInput, levainFirst)), ['Salt']);
  assert.deepEqual(rowLabels(getStepAmounts('mix-salt', defaultRecipeInput, saltFirst)), [
    'Wheat Type 1050 flour',
    'Water',
    'Salt',
  ]);
  assert.deepEqual(rowLabels(getStepAmounts('mix-levain', defaultRecipeInput, saltFirst)), ['Levain']);
});

test('merged mix-and-rest steps from the display timeline have amounts', () => {
  const schedule = scheduleWith({ autolyseEnabled: true, saltAfterLevain: true });

  assert.deepEqual(
    rowLabels(getStepAmounts('mix-levain-rest-after-levain', defaultRecipeInput, schedule)),
    ['Levain'],
  );
  assert.deepEqual(
    rowLabels(getStepAmounts('mix-salt-rest-after-salt', defaultRecipeInput, schedule)),
    ['Salt'],
  );
});

test('steps without ingredients have no amounts', () => {
  const schedule = scheduleWith({});
  const ids = ['pre-shape', 'shape', 'stretch-fold-1', 'cold-retard', 'room-proof', 'bake-closed'];

  for (const id of ids) {
    assert.equal(getStepAmounts(id, defaultRecipeInput, schedule), null, id);
  }
});

test('an invalid recipe gives no amounts instead of wrong ones', () => {
  const broken: RecipeInput = { ...defaultRecipeInput, finalDoughWeightGrams: 0, hydrationPercent: -500 };
  const schedule = scheduleWith({ autolyseEnabled: true });

  assert.equal(getStepAmounts('autolyse', broken, schedule), null);
  assert.equal(getStepAmounts('build-levain', broken, schedule), null);
});

test('the ids of a real display timeline are the ones that get amounts', () => {
  const schedule = scheduleWith({
    includeStarterPrep: true,
    starterFromFridge: true,
    autolyseEnabled: true,
    saltAfterLevain: true,
    restAfterLevainMinutes: 30,
    restAfterSaltMinutes: 30,
  });
  const timeline = formatTimelineForDisplay(buildTimeline(schedule, defaultRecipeInput));
  const withAmounts = timeline
    .filter((step) => getStepAmounts(step.id, defaultRecipeInput, schedule))
    .map((step) => step.id);

  assert.ok(withAmounts.includes('build-levain'));
  assert.ok(withAmounts.includes('autolyse'));
  assert.ok(withAmounts.includes('mix-levain-rest-after-levain'));
  assert.ok(withAmounts.includes('mix-salt-rest-after-salt'));
  assert.ok(!withAmounts.includes('shape'));
});

test('detail loses the grams the disclosure now shows', () => {
  const schedule = scheduleWith({
    autolyseEnabled: true,
    saltAfterLevain: true,
    restAfterLevainMinutes: 30,
  });
  const timeline = formatTimelineForDisplay(buildTimeline(schedule, defaultRecipeInput));
  const mixLevain = timeline.find((step) => step.id.startsWith('mix-levain'));

  assert.ok(mixLevain);
  assert.match(mixLevain.detail ?? '', /g levain/);
  assert.equal(getStepDetailWithoutAmounts(mixLevain, true), '30 min rest');
  assert.equal(getStepDetailWithoutAmounts(mixLevain, false), mixLevain.detail);
});

test('a mix step with no rest has no detail left once the grams move out', () => {
  assert.equal(getStepDetailWithoutAmounts({ id: 'mix-salt', detail: '20g salt' }, true), undefined);
});

test('refresh detail keeps the ratio and drops the grams', () => {
  const detail = '1:3:3 · 10g starter + 30g flour + 30g water (70g total)';

  assert.equal(getStepDetailWithoutAmounts({ id: 'refresh-starter', detail }, true), '1:3:3 feeding');
});

test('other details pass through untouched', () => {
  assert.equal(
    getStepDetailWithoutAmounts({ id: 'autolyse', detail: 'Flour and water only' }, true),
    'Flour and water only',
  );
  assert.equal(
    getStepDetailWithoutAmounts({ id: 'build-levain', detail: '1:5:5 feeding · ready' }, true),
    '1:5:5 feeding · ready',
  );
});
