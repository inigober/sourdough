import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultRecipeInput } from '../recipe/defaults.ts';
import { listLocalBakeHistorySummaries, createLocalBakeHistorySession } from './localBakeHistoryStorage.ts';
import { createDefaultScheduleInput } from '../schedule/defaults.ts';
import { buildBakeSummaryLine, formatLoafSize, pickBakeRecipeFacts } from './bakeSummaryLine.ts';

const wheat = { id: 'a', flourType: 'wheatType1050', percent: 100 } as const;

test('one loaf: hydration, dough weight and the single flour without "100%"', () => {
  const line = buildBakeSummaryLine({
    hydrationPercent: 78,
    finalDoughWeightGrams: 900,
    numberOfLoaves: 1,
    doughFlours: [wheat],
  });

  assert.equal(line, '78% · 900 g · Wheat Type 1050');
});

test('several loaves show the weight per loaf', () => {
  assert.equal(formatLoafSize({ finalDoughWeightGrams: 900, numberOfLoaves: 2 }), '2 × 450 g');
  assert.equal(formatLoafSize({ finalDoughWeightGrams: 1000, numberOfLoaves: 3 }), '3 × 333.3 g');
});

test('a two-flour blend keeps both percentages', () => {
  const line = buildBakeSummaryLine({
    hydrationPercent: 75.5,
    finalDoughWeightGrams: 900,
    numberOfLoaves: 2,
    doughFlours: [
      { id: 'a', flourType: 'wheatType1050', percent: 70 },
      { id: 'b', flourType: 'wholeWheat', percent: 30 },
    ],
  });

  assert.equal(line, '75.5% · 2 × 450 g · 70% Wheat Type 1050 + 30% Whole wheat');
});

test('missing parts are skipped and nothing at all gives an empty line', () => {
  assert.equal(buildBakeSummaryLine({ hydrationPercent: 70 }), '70%');
  assert.equal(buildBakeSummaryLine({ finalDoughWeightGrams: 800, doughFlours: [wheat] }), '800 g · Wheat Type 1050');
  assert.equal(buildBakeSummaryLine({}), '');
  assert.equal(buildBakeSummaryLine(undefined), '');
});

test('pickBakeRecipeFacts tolerates old or broken recipe snapshots', () => {
  assert.equal(pickBakeRecipeFacts(null), undefined);
  assert.equal(pickBakeRecipeFacts('nope'), undefined);
  assert.equal(pickBakeRecipeFacts({}), undefined);

  const facts = pickBakeRecipeFacts({
    hydrationPercent: '78',
    finalDoughWeightGrams: 900,
    numberOfLoaves: 0,
    doughFlours: [
      { id: 'x', flourType: 'spelt', percent: 100 },
      { id: 'y', flourType: 'wholeRye', percent: 100 },
      null,
    ],
  });

  assert.deepEqual(facts, {
    finalDoughWeightGrams: 900,
    doughFlours: [{ id: 'y', flourType: 'wholeRye', percent: 100 }],
  });
});

test('the on-device History list carries the recipe facts', () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };

  createLocalBakeHistorySession(
    {
      recipeName: 'Country loaf',
      recipeInput: defaultRecipeInput,
      scheduleInput: createDefaultScheduleInput(defaultRecipeInput),
      startedAt: '2026-05-01T08:00:00.000Z',
      completedAt: '2026-05-02T10:00:00.000Z',
      steps: [],
    },
    storage,
  );

  const [summary] = listLocalBakeHistorySummaries(storage);
  assert.equal(summary?.recipeFacts?.hydrationPercent, defaultRecipeInput.hydrationPercent);
  assert.ok(buildBakeSummaryLine(summary?.recipeFacts).includes('%'));
});
