import assert from 'node:assert/strict';
import test from 'node:test';

import { readStylesheet } from './readStylesheet.ts';

const css = readStylesheet();

const SPACE_TOKENS = {
  '--space-1': '4px',
  '--space-2': '8px',
  '--space-3': '12px',
  '--space-4': '16px',
  '--space-5': '20px',
  '--space-6': '24px',
  '--space-8': '32px',
  '--space-12': '48px',
};

// Raw pixel values that are allowed because they are tied to one control, not to the spacing scale:
// 1px hairlines and 38px / 40px offsets that clear an icon inside an input or an indented row.
const ALLOWED_RAW_PX = new Set(['1px', '38px', '40px']);

test('spacing tokens are defined with the agreed values', () => {
  for (const [token, value] of Object.entries(SPACE_TOKENS)) {
    assert.match(css, new RegExp(`${token}:\\s*${value};`), `${token} should be ${value}`);
  }
});

test('gap, padding and margin use spacing tokens instead of raw pixel values', () => {
  const declarations = [...css.matchAll(/(?<![-\w])(?:gap|row-gap|column-gap|padding(?:-[a-z]+)?|margin(?:-[a-z]+)?):\s*([^;]+);/g)];
  const offenders: string[] = [];
  for (const [, value] of declarations) {
    if (value.includes('(') && !value.startsWith('var(')) continue; // calc() with safe-area insets is tied to the footer height
    for (const word of value.trim().split(/\s+/)) {
      if (/^-/.test(word)) continue; // negative offsets pull an element over a neighbour
      if (/^\d+(\.\d+)?px$/.test(word) && !ALLOWED_RAW_PX.has(word)) offenders.push(value.trim());
    }
  }
  assert.deepEqual([...new Set(offenders)], []);
});
