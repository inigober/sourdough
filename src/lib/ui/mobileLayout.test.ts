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

test('flour percent control keeps digits separate from the external suffix', () => {
  assert.equal(
    flourPercentControlFitsTwoDigits(
      MOBILE_LAYOUT.flourPercentControlWidth,
      MOBILE_LAYOUT.flourPercentStepperWidth,
    ),
    true,
  );
  assert.match(stylesCss, /\.flour-percent-stepper__control\s*\{[^}]*width:\s*5\.5rem/s);
  assert.match(stylesCss, /\.flour-percent-stepper__suffix\s*\{/s);
  assert.match(stylesCss, /\.flour-percent-stepper__input\s*\{[^}]*padding-right:\s*2\.25rem/s);
  assert.match(stylesCss, /\.flour-percent-stepper\s*\{[^}]*display:\s*flex/s);
});

test('wizard save control stays compact with icon and label', () => {
  assert.match(stylesCss, /\.wizard-nav__save\s*\{[^}]*display:\s*inline-flex/s);
  assert.match(stylesCss, /\.wizard-nav__save\s*\{[^}]*width:\s*auto/s);
  assert.match(stylesCss, /\.wizard-nav__save\s*\{[^}]*padding:\s*10px 14px/s);
});

test('timeline rows stack date above time in the left column', () => {
  assert.match(stylesCss, /\.timeline-row__layout\s*\{[^}]*align-items:\s*start/s);
  assert.match(stylesCss, /\.timeline-row__time-col\s*\{[^}]*display:\s*grid/s);
  assert.match(stylesCss, /\.companion-overview__time-col\s*\{[^}]*display:\s*grid/s);
});

test('summary groups stay in a two-column grid on desktop', () => {
  assert.match(stylesCss, /\.summary-groups\s*\{[^}]*align-items:\s*start/s);
  assert.match(
    stylesCss,
    /@media \(min-width: 640px\)\s*\{\s*\.summary-groups\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
  );
  assert.doesNotMatch(
    stylesCss,
    /@media \(min-width: 960px\)\s*\{\s*\.summary-groups\s*\{[^}]*grid-template-columns:\s*repeat\(3/s,
  );
});

test('number fields use a bounded width for short numeric values', () => {
  assert.match(stylesCss, /--number-field-width:\s*7\.25rem/s);
  assert.match(
    stylesCss,
    /\.number-field__control\s*\{[^}]*max-width:\s*var\(--number-field-width\)/s,
  );
});

test('number field stepper controls share a bordered shell with the input', () => {
  assert.match(stylesCss, /\.number-field__control\s*\{[^}]*border:\s*1px solid #e1c7ad/s);
  assert.match(stylesCss, /\.number-field__control input\s*\{[^}]*border:\s*0/s);
});

test('mix day date and time inputs stay constrained inside field cards', () => {
  assert.match(stylesCss, new RegExp(`\\.${MOBILE_LAYOUT.mixDayFormClass}[^{]*\\{[^}]*min-width:\\s*0`));
  assert.match(stylesCss, /\.field-card input\[type='date'\][^{]*\{[^}]*max-width:\s*100%/s);
  assert.match(stylesCss, /\.field-card input\[type='time'\][^{]*\{[^}]*max-width:\s*100%/s);
  assert.match(stylesCss, /\.field-grid--pair > \.field-card\s*\{[^}]*min-width:\s*0/s);
});

test('dated timeline rows align step labels with the time row', () => {
  assert.match(stylesCss, /\.timeline-row__content-col--dated\s*\{[^}]*align-self:\s*end/s);
});
