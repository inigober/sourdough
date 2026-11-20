import assert from 'node:assert/strict';
import test from 'node:test';

import { MOBILE_LAYOUT, flourPercentControlFitsTwoDigits } from './mobileLayout.ts';
import { readStylesheet } from './readStylesheet.ts';

const stylesCss = readStylesheet();

test('flour percent control keeps digits separate from the external suffix', () => {
  assert.equal(
    flourPercentControlFitsTwoDigits(
      MOBILE_LAYOUT.flourPercentPillMinWidth,
      MOBILE_LAYOUT.flourPercentControlSize,
    ),
    true,
  );
  assert.match(stylesCss, /\.flour-percent-stepper\s*\{[^}]*--flour-percent-control-size:\s*2\.35rem/s);
  assert.match(stylesCss, /\.flour-percent-stepper__button\s*\{[^}]*height:\s*var\(--flour-percent-control-size\)/s);
  assert.match(stylesCss, /\.flour-percent-stepper__value\s*\{[^}]*height:\s*var\(--flour-percent-control-size\)/s);
  assert.match(stylesCss, /\.flour-percent-stepper__value\s*\{[^}]*min-width:\s*4\.5rem/s);
  assert.match(stylesCss, /\.flour-percent-stepper__suffix\s*\{/s);
  assert.match(stylesCss, /\.flour-percent-stepper\s*\{[^}]*display:\s*flex/s);
});

test('wizard footer buttons share equal columns and one height; Save takes its own row on narrow screens', () => {
  assert.match(stylesCss, /\.wizard-nav--steps\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(stylesCss, /\.wizard-nav--steps \.wizard-button\s*\{[^}]*min-height:\s*48px/s);
  assert.match(stylesCss, /\.wizard-nav--has-save \.wizard-nav__save\s*\{[^}]*grid-column:\s*1 \/ -1/s);
});

test('the sticky footer wrap is the sticky element, so it can stick', () => {
  assert.match(stylesCss, /\.page-shell__footer-wrap\s*\{[^}]*position:\s*sticky/s);
  assert.match(stylesCss, /\.page-shell__footer-wrap > \.page-shell__footer\s*\{[^}]*position:\s*static/s);
});

test('timeline rows use a fixed-width time column so step names align across days', () => {
  assert.match(stylesCss, /--timeline-time-width:\s*7\.75rem/s);
  assert.match(stylesCss, /\.timeline-row__layout--dated \.timeline-row__time\s*\{[^}]*grid-row:\s*2/s);
  assert.match(stylesCss, /\.timeline-row__layout--dated \.timeline-row__content-col\s*\{[^}]*grid-row:\s*2/s);
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
  assert.match(stylesCss, /--number-field-width:\s*10\.25rem/s);
  assert.match(
    stylesCss,
    /\.number-field__control\s*\{[^}]*max-width:\s*var\(--number-field-width\)/s,
  );
});

test('number field stepper controls share a bordered shell with the input', () => {
  assert.match(stylesCss, /\.number-field__control\s*\{[^}]*border:\s*1px solid var\(--color-border\)/s);
  assert.match(stylesCss, /\.number-field__control input\s*\{[^}]*border:\s*0/s);
});

test('mix day date and time inputs stay constrained inside field cards', () => {
  assert.match(stylesCss, new RegExp(`\\.${MOBILE_LAYOUT.mixDayFormClass}[^{]*\\{[^}]*min-width:\\s*0`));
  assert.match(stylesCss, /\.field-card input\[type='date'\][^{]*\{[^}]*max-width:\s*100%/s);
  assert.match(stylesCss, /\.field-card input\[type='time'\][^{]*\{[^}]*max-width:\s*100%/s);
  assert.match(stylesCss, /\.field-grid--pair > \.field-card\s*\{[^}]*min-width:\s*0/s);
});

test('ingredient summary cards keep full-width columns on wide desktop', () => {
  assert.match(
    stylesCss,
    /@media \(min-width: 960px\)\s*\{\s*\.recipe-results__calculated\s*\{[^}]*grid-template-columns:\s*1fr/s,
  );
  assert.match(
    stylesCss,
    /\.recipe-results__calculated \.summary-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
  );
});
