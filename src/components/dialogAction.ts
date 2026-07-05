import type { MouseEvent } from 'react';

/** Run a dialog button action without letting the click reach the backdrop. */
export function runDialogButtonAction(
  event: MouseEvent<HTMLElement>,
  action: () => void,
): void {
  event.preventDefault();
  event.stopPropagation();
  action();
}
