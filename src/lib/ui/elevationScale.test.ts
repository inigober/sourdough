import assert from 'node:assert/strict';
import test from 'node:test';

import { readStylesheet } from './readStylesheet.ts';

const css = readStylesheet();

test('elevation tokens are defined', () => {
  for (const token of ['--shadow-raised', '--shadow-overlay', '--shadow-knob']) {
    assert.match(css, new RegExp(`${token}:\\s*[^;]+;`), `${token} is not defined`);
  }
});

test('box-shadow is none, an inset line, a focus ring, or an elevation token', () => {
  const values = [...css.matchAll(/(?<![-\w])box-shadow:\s*([^;]+);/g)].map((match) => match[1].trim());
  const allowed = [
    /^none$/,
    /^inset /, // selected and current-step outlines drawn inside the control
    /^0 0 0 [\d.]+px var\(--color-[a-z-]+\)$/, // focus rings
    /^var\(--shadow-(raised|overlay|knob)\)$/,
  ];
  const offenders = values.filter((value) => !allowed.some((pattern) => pattern.test(value)));
  assert.deepEqual([...new Set(offenders)], []);
});
