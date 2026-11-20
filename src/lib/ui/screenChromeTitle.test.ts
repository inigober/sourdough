import assert from 'node:assert/strict';
import test from 'node:test';

import { readStylesheet } from './readStylesheet.ts';

const stylesCss = readStylesheet();

/** The declarations of every rule whose selector list contains exactly this selector. */
function declarationsFor(selector: string): string {
  return [...stylesCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectors]) => selectors.split(',').some((part) => part.trim() === selector))
    .map(([, , body]) => body)
    .join('\n');
}

test('a long screen title wraps to two lines in the header instead of being cut off', () => {
  const title = declarationsFor('.screen-chrome__title');

  assert.doesNotMatch(title, /white-space:\s*nowrap/);
  assert.doesNotMatch(title, /text-overflow:\s*ellipsis/);
  assert.match(title, /-webkit-line-clamp:\s*2/);
  assert.match(title, /overflow-wrap:\s*(anywhere|break-word)/);
});
