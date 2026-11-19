import assert from 'node:assert/strict';
import test from 'node:test';

import { createFlourBlendEntry } from './flourBlend.ts';
import { defaultRecipeInput } from './defaults.ts';
import { recipeTemplates } from './templates.ts';
import {
  DOUGH_WEIGHT_LIMITS,
  hasBlockingValidationIssue,
  hasMissingNumber,
  validateRecipeInput,
} from './validation.ts';

function issueMessages(
  input: typeof defaultRecipeInput,
  level?: 'error' | 'warning',
): string[] {
  return validateRecipeInput(input)
    .filter((issue) => (level ? issue.level === level : true))
    .map((issue) => issue.message);
}

test('valid default recipe has no blocking issues', () => {
  const issues = validateRecipeInput(defaultRecipeInput);
  assert.equal(hasBlockingValidationIssue(issues), false);
  assert.equal(issues.length, 0);
});

test('blocking errors stop before range and flour blend checks', () => {
  const issues = validateRecipeInput({
    ...defaultRecipeInput,
    finalDoughWeightGrams: Number.NaN,
    hydrationPercent: 0,
    doughFlours: [],
  });

  assert.equal(hasBlockingValidationIssue(issues), true);
  assert.ok(issues.some((issue) => issue.field === 'finalDoughWeightGrams'));
  assert.equal(
    issues.some((issue) => issue.message.includes('Flour percentages must add up')),
    false,
  );
});

test('blocking matrix covers dough, hydration, and fermentation bounds', () => {
  assert.ok(issueMessages({ ...defaultRecipeInput, finalDoughWeightGrams: 0 }, 'error').length > 0);
  assert.ok(issueMessages({ ...defaultRecipeInput, numberOfLoaves: 0 }, 'error').length > 0);
  assert.ok(issueMessages({ ...defaultRecipeInput, hydrationPercent: 49 }, 'error').length > 0);
  assert.ok(issueMessages({ ...defaultRecipeInput, hydrationPercent: 111 }, 'error').length > 0);
  assert.ok(issueMessages({ ...defaultRecipeInput, saltPercent: -1 }, 'error').length > 0);
  assert.ok(issueMessages({ ...defaultRecipeInput, levainHydrationPercent: 39 }, 'error').length > 0);
  assert.ok(issueMessages({ ...defaultRecipeInput, targetBulkHours: 1.5 }, 'error').length > 0);
  assert.ok(issueMessages({ ...defaultRecipeInput, roomTemperatureCelsius: 15 }, 'error').length > 0);
});

test('flour blend errors require at least one flour and a 100% total', () => {
  assert.ok(
    issueMessages({ ...defaultRecipeInput, doughFlours: [] }, 'error').some((message) =>
      message.includes('at least one flour'),
    ),
  );

  const unevenBlend = {
    ...defaultRecipeInput,
    doughFlours: [
      createFlourBlendEntry('wheatType1050', 60),
      createFlourBlendEntry('wholeWheat', 30),
    ],
  };

  assert.ok(
    issueMessages(unevenBlend, 'error').some((message) => message.includes('add up to 100%')),
  );
});

test('warnings do not block validation', () => {
  const lowSalt = validateRecipeInput({ ...defaultRecipeInput, saltPercent: 1.5 });
  const sleepyLevain = validateRecipeInput({ ...defaultRecipeInput, levainActivity: 'sleepy' });

  assert.equal(hasBlockingValidationIssue(lowSalt), false);
  assert.equal(hasBlockingValidationIssue(sleepyLevain), false);
  assert.ok(lowSalt.some((issue) => issue.level === 'warning' && issue.field === 'saltPercent'));
  assert.ok(
    sleepyLevain.some((issue) => issue.level === 'warning' && issue.field === 'levainActivity'),
  );
});

test('hasBlockingValidationIssue ignores warnings', () => {
  const issues = [
    { field: 'saltPercent' as const, level: 'warning' as const, message: 'Salt warning' },
  ];

  assert.equal(hasBlockingValidationIssue(issues), false);
});

// Symptom: 50g was accepted silently and produced 1g salt / 5g levain.
test('very small dough weights warn but do not block', () => {
  const issues = validateRecipeInput({ ...defaultRecipeInput, finalDoughWeightGrams: 50 });
  const weightIssues = issues.filter((issue) => issue.field === 'finalDoughWeightGrams');

  assert.equal(hasBlockingValidationIssue(issues), false);
  assert.equal(weightIssues.length, 1);
  assert.equal(weightIssues[0].level, 'warning');
  assert.match(weightIssues[0].message, /Under about 300g/);
});

test('very large dough weights warn but do not block', () => {
  const issues = validateRecipeInput({ ...defaultRecipeInput, finalDoughWeightGrams: 4000 });

  assert.equal(hasBlockingValidationIssue(issues), false);
  assert.ok(
    issues.some(
      (issue) =>
        issue.field === 'finalDoughWeightGrams' && issue.level === 'warning' && /3kg/.test(issue.message),
    ),
  );
});

test('dough weight is clean inside the reliable range, including both edges', () => {
  for (const grams of [DOUGH_WEIGHT_LIMITS.warnBelow, 900, DOUGH_WEIGHT_LIMITS.warnAbove]) {
    const issues = validateRecipeInput({ ...defaultRecipeInput, finalDoughWeightGrams: grams });
    assert.equal(
      issues.some((issue) => issue.field === 'finalDoughWeightGrams'),
      false,
      `${grams}g should have no weight message`,
    );
  }
});

test('dough weight outside the hard limits blocks with the range in the message', () => {
  const tooSmall = validateRecipeInput({
    ...defaultRecipeInput,
    finalDoughWeightGrams: DOUGH_WEIGHT_LIMITS.min - 1,
  });
  const tooBig = validateRecipeInput({
    ...defaultRecipeInput,
    finalDoughWeightGrams: DOUGH_WEIGHT_LIMITS.max + 1,
  });

  assert.equal(hasBlockingValidationIssue(tooSmall), true);
  assert.equal(hasBlockingValidationIssue(tooBig), true);
  assert.match(tooSmall[0].message, /between 50g and 10,000g/);
});

test('every built-in template sits inside the reliable dough weight range', () => {
  for (const template of recipeTemplates) {
    const issues = validateRecipeInput(template.recipeInput);
    assert.equal(
      issues.some((issue) => issue.field === 'finalDoughWeightGrams'),
      false,
      `${template.id} should not trigger a weight message`,
    );
  }
});

test('a cleared number field blocks with a message that says what to enter', () => {
  const issues = validateRecipeInput({ ...defaultRecipeInput, hydrationPercent: Number.NaN });

  assert.equal(hasBlockingValidationIssue(issues), true);
  assert.match(issues[0].message, /Enter a hydration/);
});

test('hasMissingNumber spots a cleared field so it is never saved into a draft', () => {
  assert.equal(hasMissingNumber(defaultRecipeInput), false);
  assert.equal(hasMissingNumber({ ...defaultRecipeInput, finalDoughWeightGrams: Number.NaN }), true);
});
