import assert from 'node:assert/strict';
import test from 'node:test';

import { readStylesheet } from './readStylesheet.ts';

const css = readStylesheet();

function rulesFor(selector: string): string[] {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|\\n)[ \\t]*${escaped}[ \\t]*\\{([^}]*)\\}`, 'g'))].map((match) => match[1]);
}

test('Card is one container level: defined once, large radius, border, no shadow', () => {
  const rules = rulesFor('.card');
  assert.equal(rules.length, 1, 'there should be exactly one .card rule (no per-breakpoint overrides)');
  assert.match(rules[0], /border-radius:\s*var\(--radius-lg\)/);
  assert.match(rules[0], /border:\s*1px solid/);
  assert.match(rules[0], /box-shadow:\s*none/);
  assert.equal(rulesFor('.summary-group.card').length, 0, 'no special-case card inside the summary');
});

test('Field is flat: no tinted box, border or padding around label and control', () => {
  const rules = rulesFor('.field-card');
  assert.equal(rules.length, 1);
  assert.match(rules[0], /background:\s*none/);
  assert.match(rules[0], /border:\s*0/);
  assert.match(rules[0], /padding:\s*0/);
});

test('Field error and warning states bring their own box, since the base field has none', () => {
  for (const state of ['.field-card--error', '.field-card--warning']) {
    const [rule] = rulesFor(state);
    assert.match(rule, /padding:\s*var\(--space-3\)/, `${state} needs padding`);
    assert.match(rule, /border-radius:\s*var\(--radius-md\)/, `${state} needs a radius`);
  }
});

test('Sheet: dialogs sit at the bottom with rounded top corners, a grabber and a safe-area bottom', () => {
  const [backdrop] = rulesFor('.dialog-backdrop');
  assert.match(backdrop, /place-items:\s*end center/);
  assert.equal(rulesFor('.dialog-backdrop').length, 1, 'no per-breakpoint copy of the backdrop rule');

  const [card] = rulesFor('.dialog-card');
  assert.match(card, /border-radius:\s*var\(--radius-xl\) var\(--radius-xl\) 0 0/);
  assert.match(card, /max-height:\s*90dvh/);
  assert.match(card, /safe-area-inset-bottom/);

  // One shared grabber rule for the dialogs and the coach sheet.
  assert.match(css, /\.dialog-card::before,\s*\.companion-coach__header::before\s*\{[^}]*content:\s*''/);
});

test('Sheet: dialogs and the coach slide up from the bottom edge', () => {
  assert.match(css, /@keyframes sheet-in\s*\{\s*from\s*\{[^}]*translateY\(100%\)/);
  assert.match(css, /\.dialog-card\s*\{\s*animation:\s*sheet-in/);
  assert.doesNotMatch(css, /@keyframes dialog-card-in/);
});

test('the step edit panel cannot be pushed wider than its row by a native time input', () => {
  const [panel] = rulesFor('.step-edit');
  assert.match(panel, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);

  const [field] = rulesFor('.step-edit__field');
  assert.match(field, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);

  const [time] = rulesFor(".step-edit__field input[type='time']");
  assert.match(time, /width:\s*100%/);
  assert.match(time, /min-width:\s*0/);
  assert.match(time, /max-width:\s*100%/);
});

test('Start baking on a Saved row has a tinted brand look without being the solid primary button', () => {
  // Two classes: components/buttons.css loads later, so a one-class rule here would lose to `.button`.
  const [bake] = rulesFor('.saved-recipe-row__actions .saved-recipe-row__bake');
  assert.match(bake, /background:\s*var\(--color-hover-accent\)/);
  assert.match(bake, /color:\s*var\(--color-primary-text\)/);
  assert.match(bake, /border-color:\s*var\(--color-primary-text\)/);
});
