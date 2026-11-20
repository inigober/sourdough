import assert from 'node:assert/strict';
import test from 'node:test';

import { readStylesheet } from './readStylesheet.ts';

const css = readStylesheet();

const FONT_SIZE_TOKENS = ['--text-xs', '--text-sm', '--text-md', '--text-lg', '--title-3', '--title-2', '--title-1', '--display'];
const FONT_WEIGHT_TOKENS = ['--weight-regular', '--weight-semibold', '--weight-bold'];

function declarationValues(property: string): string[] {
  return [...css.matchAll(new RegExp(`(?<![-\\w])${property}:\\s*([^;]+);`, 'g'))].map((match) => match[1].trim());
}

function isTokenUse(value: string, tokens: string[]): boolean {
  return value === 'inherit' || tokens.some((token) => value === `var(${token})`);
}

test('every type scale and weight token is defined', () => {
  for (const token of [...FONT_SIZE_TOKENS, ...FONT_WEIGHT_TOKENS]) {
    assert.match(css, new RegExp(`${token}:\\s*[^;]+;`), `${token} is not defined`);
  }
});

test('the three weights are 400, 600 and 700', () => {
  assert.match(css, /--weight-regular:\s*400;/);
  assert.match(css, /--weight-semibold:\s*600;/);
  assert.match(css, /--weight-bold:\s*700;/);
});

test('font-size always comes from the type scale', () => {
  const offenders = declarationValues('font-size').filter((value) => !isTokenUse(value, FONT_SIZE_TOKENS));
  assert.deepEqual([...new Set(offenders)], []);
});

test('font-weight always comes from the three weight tokens', () => {
  const offenders = declarationValues('font-weight').filter((value) => !isTokenUse(value, FONT_WEIGHT_TOKENS));
  assert.deepEqual([...new Set(offenders)], []);
});
