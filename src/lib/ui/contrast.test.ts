import assert from 'node:assert/strict';
import test from 'node:test';

import { contrastRatio, readColourPalettes } from './contrast.ts';
import { readStylesheet } from './readStylesheet.ts';

const css = readStylesheet();
const { light, dark } = readColourPalettes(css);

// Tokens used as text colours, and the surfaces they sit on most. See docs/product/accessibility.md.
const TEXT_TOKENS = [
  'text',
  'text-muted',
  'text-subtle',
  'text-body',
  'primary-text',
  'help',
  'danger',
  'success',
  'warning-text',
];
const SURFACE_TOKENS = ['bg', 'surface', 'surface-muted'];

test('known contrast values match the WCAG reference', () => {
  assert.equal(contrastRatio('#000000', '#ffffff').toFixed(2), '21.00');
  assert.equal(contrastRatio('#777777', '#777777').toFixed(2), '1.00');
});

for (const [name, palette] of [
  ['light', light],
  ['dark', dark],
] as const) {
  test(`${name} palette: every text token is at least 4.5:1 on the main surfaces`, () => {
    const failures: string[] = [];

    for (const textToken of TEXT_TOKENS) {
      for (const surfaceToken of SURFACE_TOKENS) {
        const ratio = contrastRatio(palette[textToken], palette[surfaceToken]);
        if (ratio < 4.5) {
          failures.push(`${textToken} on ${surfaceToken}: ${ratio.toFixed(2)}`);
        }
      }
    }

    assert.deepEqual(failures, []);
  });

  test(`${name} palette: text on a primary-coloured fill is at least 4.5:1`, () => {
    assert.ok(contrastRatio(palette['on-primary'], palette.primary) >= 4.5);
  });
}
