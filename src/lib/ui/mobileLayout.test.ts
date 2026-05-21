import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { MOBILE_LAYOUT, flourPercentControlFitsTwoDigits } from './mobileLayout.ts';

const stylesCss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../styles.css'),
  'utf8',
);

test('flour percent control width balances two digits without growing too wide', () => {
  assert.equal(
    flourPercentControlFitsTwoDigits(
      MOBILE_LAYOUT.flourPercentControlWidth,
      MOBILE_LAYOUT.flourPercentStepperWidth,
    ),
    true,
  );
  assert.match(stylesCss, /\.flour-percent-stepper__control\s*\{[^}]*width:\s*6\.25rem/s);
  assert.match(stylesCss, /\.flour-percent-stepper__suffix\s*\{/s);
  assert.match(stylesCss, /\.flour-percent-stepper__control\s*\{[^}]*flex:\s*none/s);
  assert.match(
    stylesCss,
    /\.flour-percent-stepper__input\s*\{[^}]*padding-right:\s*calc\(2\.25rem \+ 1\.15rem\)/s,
  );
});

test('mix day date and time inputs stay constrained inside field cards', () => {
  assert.match(stylesCss, new RegExp(`\\.${MOBILE_LAYOUT.mixDayFormClass}[^{]*\\{[^}]*min-width:\\s*0`));
  assert.match(stylesCss, /\.field-card input\[type='date'\][^{]*\{[^}]*max-width:\s*100%/s);
  assert.match(stylesCss, /\.field-card input\[type='time'\][^{]*\{[^}]*max-width:\s*100%/s);
  assert.match(stylesCss, /\.field-grid--pair > \.field-card\s*\{[^}]*min-width:\s*0/s);
});
