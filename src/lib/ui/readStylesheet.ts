import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const STYLES_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../styles');

/**
 * Reads the app's CSS as one string, following the `@import` lines in `src/styles/index.css` in order.
 * Tests that check CSS values use this, so they do not care how the CSS is split into files.
 */
export function readStylesheet(): string {
  const index = readFileSync(join(STYLES_DIR, 'index.css'), 'utf8');
  const importedFiles = [...index.matchAll(/@import\s+'\.\/([^']+)'/g)].map((match) => match[1]);
  return importedFiles.map((file) => readFileSync(join(STYLES_DIR, file), 'utf8')).join('');
}
