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
