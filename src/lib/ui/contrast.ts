/** WCAG 2.x contrast helpers, used by `contrast.test.ts` to guard the colour tokens in src/styles/tokens.css. */

export type ColourTokens = Record<string, string>;

function toLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a `#rrggbb` colour. */
export function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) {
    throw new Error(`Not a #rrggbb colour: ${hex}`);
  }

  const [red, green, blue] = [0, 2, 4].map((offset) => toLinear(parseInt(match[1].slice(offset, offset + 2), 16)));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** Contrast ratio between two `#rrggbb` colours, from 1 (identical) to 21 (black on white). */
export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Returns the text between the `{` that follows `startIndex` and its matching `}`. */
function readBlock(css: string, startIndex: number): string {
  const open = css.indexOf('{', startIndex);
  let depth = 0;

  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') {
      depth += 1;
    } else if (css[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        return css.slice(open + 1, index);
      }
    }
  }

  throw new Error('Unbalanced braces in CSS');
}

function readTokens(block: string): ColourTokens {
  const tokens: ColourTokens = {};
  for (const match of block.matchAll(/--color-([\w-]+):\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

/** The light palette (`:root`) and the dark palette (light values overridden by the dark block). */
export function readColourPalettes(css: string): { light: ColourTokens; dark: ColourTokens } {
  const light = readTokens(readBlock(css, css.indexOf(':root {')));
  const darkMediaStart = css.indexOf('@media (prefers-color-scheme: dark)');
  const darkRootStart = css.indexOf(':root {', darkMediaStart);
  const dark = { ...light, ...readTokens(readBlock(css, darkRootStart)) };
  return { light, dark };
}
