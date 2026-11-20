import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import type { RecipeInput } from '../recipe/types.ts';
import { buildTimeline } from './buildTimeline.ts';
import { createDefaultScheduleInput } from './defaults.ts';
import type { ScheduleInput, TimelineStep } from './types.ts';

// The levain prep steps sit before mixing and are anchored backwards from the mix, so they are not part of the chain.
const PREP_STEP_IDS = new Set(['refresh-starter', 'build-levain']);

function chainGaps(timeline: TimelineStep[]): string[] {
  const chain = timeline.filter((step) => !PREP_STEP_IDS.has(step.id));
  const problems: string[] = [];
  let furthestEnd = chain[0].startOffsetMinutes;

  for (const step of chain) {
    if (step.startOffsetMinutes > furthestEnd) {
      problems.push(`${step.label} starts ${step.startOffsetMinutes - furthestEnd} min after the previous step ended`);
    }
    furthestEnd = Math.max(furthestEnd, step.startOffsetMinutes + step.durationMinutes);
  }

  return problems;
}

type Scenario = { name: string; recipe: RecipeInput; change?: Partial<ScheduleInput> };

const scenarios: Scenario[] = [
  { name: 'default recipe', recipe: defaultRecipeInput },
  { name: '80% hydration (slap, stretch and coil folds)', recipe: { ...defaultRecipeInput, hydrationPercent: 80 } },
  { name: 'short bulk, so the last coil fold is dropped', recipe: { ...defaultRecipeInput, targetBulkHours: 5 } },
  { name: 'no folds at all', recipe: defaultRecipeInput, change: { stretchAndFoldSets: 0, coilFoldSets: 0, slapAndFolds: 0 } },
  { name: 'slap and folds only', recipe: defaultRecipeInput, change: { stretchAndFoldSets: 0, coilFoldSets: 0, slapAndFolds: 40 } },
  { name: 'salt before levain', recipe: defaultRecipeInput, change: { saltAfterLevain: false } },
  { name: 'room-temperature proof', recipe: defaultRecipeInput, change: { proofingStyle: 'roomTemperature' } },
];

for (const { name, recipe, change } of scenarios) {
  test(`no gap between steps from mixing to bake: ${name}`, () => {
    const schedule = { ...createDefaultScheduleInput(recipe), ...change };
    assert.deepEqual(chainGaps(buildTimeline(schedule, recipe)), []);
  });
}

test('the last fold runs until Pre-shape and says so', () => {
  const recipe = { ...defaultRecipeInput, hydrationPercent: 80 };
  const timeline = buildTimeline(createDefaultScheduleInput(recipe), recipe);
  const lastFold = timeline.find((step) => step.id === 'coil-fold-3');
  const preShape = timeline.find((step) => step.id === 'pre-shape');

  assert.ok(lastFold && preShape);
  assert.equal(lastFold.startOffsetMinutes + lastFold.durationMinutes, preShape.startOffsetMinutes);
  assert.equal(lastFold.detail, 'rest until pre-shape · Set 3 of 3');
});

test('earlier folds keep their own rest time', () => {
  const recipe = { ...defaultRecipeInput, hydrationPercent: 80 };
  const schedule = createDefaultScheduleInput(recipe);
  const timeline = buildTimeline(schedule, recipe);
  const firstFold = timeline.find((step) => step.id === 'stretch-fold-1');

  assert.equal(firstFold?.durationMinutes, schedule.stretchAndFoldRestMinutes);
});

test('extending a step does not change how many steps there are or their ids', () => {
  const recipe = { ...defaultRecipeInput, hydrationPercent: 80 };
  const ids = buildTimeline(createDefaultScheduleInput(recipe), recipe).map((step) => step.id);
  assert.deepEqual(ids.filter((id) => id.includes('fold')), [
    'slap-and-fold',
    'stretch-fold-1',
    'stretch-fold-2',
    'stretch-fold-3',
    'coil-fold-1',
    'coil-fold-2',
    'coil-fold-3',
  ]);
});
