import assert from 'node:assert/strict';
import test from 'node:test';

import { readStylesheet } from './readStylesheet.ts';

const css = readStylesheet();

function rootRule(): string {
  const match = css.match(/(?:^|\n)html\s*\{([^}]*)\}/);
  assert.ok(match, 'there should be an html rule');
  return match[1];
}

test('the root font follows the iOS Text Size setting', () => {
  assert.match(rootRule(), /font:\s*-apple-system-body/);
});

test('iOS does not add its own text inflation on top of Dynamic Type', () => {
  assert.match(rootRule(), /-webkit-text-size-adjust:\s*100%/);
});

test('every font size is in rem, so it follows the root font', () => {
  const sizes = [...css.matchAll(/(?<![-\w])font-size:\s*([^;]+);/g)].map((match) => match[1].trim());
  const pixelSizes = sizes.filter((value) => /\d\s*px/.test(value));
  assert.deepEqual(pixelSizes, []);
  const tokens = [...css.matchAll(/--(?:text|title)-[\w-]+:\s*([^;]+);/g)].map((match) => match[1].trim());
  assert.ok(tokens.length >= 7);
  assert.deepEqual(tokens.filter((value) => !/rem\b/.test(value)), []);
});
