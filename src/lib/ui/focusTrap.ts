/** Elements a keyboard or switch user can reach with Tab inside a modal sheet. */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]',
]
  // tabindex="-1" means "focus by script only": not a Tab stop, so not part of the trap's cycle.
  .map((selector) => `${selector}:not([tabindex="-1"])`)
  .join(', ');

/**
 * Where Tab should go inside a modal so focus cannot leave it.
 *
 * Returns the index to focus when the browser's own Tab step would leave the modal (first element
 * with Shift+Tab, last element with Tab, or focus currently outside the list), and `null` when the
 * browser can move focus by itself.
 */
export function getTrappedFocusIndex(
  currentIndex: number,
  focusableCount: number,
  backwards: boolean,
): number | null {
  if (focusableCount <= 0) {
    return null;
  }

  const lastIndex = focusableCount - 1;

  if (currentIndex < 0) {
    return backwards ? lastIndex : 0;
  }

  if (backwards && currentIndex === 0) {
    return lastIndex;
  }

  if (!backwards && currentIndex === lastIndex) {
    return 0;
  }

  return null;
}
