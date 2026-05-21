import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createFlourBlendEntry,
  formatFlourBlendSummary,
  getFlourGrams,
  stepFlourGrams,
  stepFlourPercent,
  updateFlourPercent,
} from './flourBlend.ts';

test('two-flour blend summary uses plus separator', () => {
  const summary = formatFlourBlendSummary([
    createFlourBlendEntry('wheatType1050', 70),
    createFlourBlendEntry('wholeRye', 30),
  ]);

  assert.equal(summary, '70% Wheat Type 1050 + 30% Whole rye');
});

test('three-or-more wheat flours use a combined wheat label', () => {
  const summary = formatFlourBlendSummary([
    createFlourBlendEntry('wheatType1050', 60),
    createFlourBlendEntry('wholeWheat', 25),
    createFlourBlendEntry('pizzaFlour', 15),
  ]);

  assert.equal(summary, 'Combined wheat flour');
});

test('three-or-more mixed wheat and rye flours use a wheat rye blend label', () => {
  const summary = formatFlourBlendSummary([
    createFlourBlendEntry('wheatType1050', 50),
    createFlourBlendEntry('wholeWheat', 30),
    createFlourBlendEntry('wholeRye', 20),
  ]);

  assert.equal(summary, 'Wheat / rye blend');
});

test('stepping grams up takes one gram from the other flour', () => {
  const total = 494;
  const doughFlours = [
    createFlourBlendEntry('wheatType1050', 80),
    createFlourBlendEntry('wholeWheat', 20),
  ];

  const wheatId = doughFlours[0].id;
  const ryeId = doughFlours[1].id;
  const beforeWheat = getFlourGrams(80, total);
  const beforeOther = getFlourGrams(20, total);

  const next = stepFlourGrams(doughFlours, wheatId, 1, total);
  const afterWheat = getFlourGrams(
    next.find((entry) => entry.id === wheatId)?.percent ?? 0,
    total,
  );
  const afterOther = getFlourGrams(
    next.find((entry) => entry.id === ryeId)?.percent ?? 0,
    total,
  );

  assert.equal(beforeWheat, 395);
  assert.equal(beforeOther, 99);
  assert.equal(afterWheat, beforeWheat + 1);
  assert.equal(afterOther, beforeOther - 1);
});

test('stepping percent up adjusts shares by one point and recalculates grams', () => {
  const total = 500;
  const doughFlours = [
    createFlourBlendEntry('wheatType1050', 80),
    createFlourBlendEntry('wholeWheat', 20),
  ];

  const wheatId = doughFlours[0].id;
  const otherId = doughFlours[1].id;

  const steppedOnce = stepFlourPercent(doughFlours, wheatId, 1);
  assert.equal(steppedOnce.find((entry) => entry.id === wheatId)?.percent, 81);
  assert.equal(steppedOnce.find((entry) => entry.id === otherId)?.percent, 19);
  assert.equal(getFlourGrams(81, total), 405);
  assert.equal(getFlourGrams(19, total), 95);

  const steppedTwice = stepFlourPercent(steppedOnce, wheatId, 1);
  assert.equal(steppedTwice.find((entry) => entry.id === wheatId)?.percent, 82);
  assert.equal(steppedTwice.find((entry) => entry.id === otherId)?.percent, 18);
});

test('sequential percent commits redistribute without swapping flour ids', () => {
  const doughFlours = [
    createFlourBlendEntry('wheatType1050', 50),
    createFlourBlendEntry('wholeWheat', 50),
  ];
  const wheatId = doughFlours[0].id;
  const otherId = doughFlours[1].id;

  const at51 = updateFlourPercent(doughFlours, wheatId, 51);
  assert.equal(at51.find((entry) => entry.id === wheatId)?.percent, 51);
  assert.equal(at51.find((entry) => entry.id === otherId)?.percent, 49);

  const at52 = updateFlourPercent(at51, wheatId, 52);
  assert.equal(at52.find((entry) => entry.id === wheatId)?.percent, 52);
  assert.equal(at52.find((entry) => entry.id === otherId)?.percent, 48);
});
