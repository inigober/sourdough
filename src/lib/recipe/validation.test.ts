import assert from 'node:assert/strict';
import test from 'node:test';

import { createFlourBlendEntry } from './flourBlend.ts';
import { defaultRecipeInput } from './defaults.ts';
import { hasBlockingValidationIssue, validateRecipeInput } from './validation.ts';

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
