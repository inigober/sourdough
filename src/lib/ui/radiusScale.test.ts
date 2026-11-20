import assert from 'node:assert/strict';
import test from 'node:test';

import { readStylesheet } from './readStylesheet.ts';

const css = readStylesheet();

const RADIUS_TOKENS = {
  '--radius-sm': '8px',
  '--radius-md': '12px',
  '--radius-lg': '16px',
  '--radius-xl': '24px',
  '--radius-pill': '999px',
};

test('radius tokens are defined with the agreed values', () => {
  for (const [token, value] of Object.entries(RADIUS_TOKENS)) {
    assert.match(css, new RegExp(`${token}:\\s*${value};`), `${token} should be ${value}`);
  }
});

test('border-radius only uses radius tokens, 0, 50% or inherit', () => {
  const values = [...css.matchAll(/(?<![-\w])border-radius:\s*([^;]+);/g)].map((match) => match[1].trim());
  const allowedWord = /^(0|50%|inherit|var\(--radius-(sm|md|lg|xl|pill)\))$/;
  const offenders = values.filter((value) => !value.split(/\s+/).every((word) => allowedWord.test(word)));
  assert.deepEqual([...new Set(offenders)], []);
});
