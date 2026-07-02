import type { MouseEvent } from 'react';

/** Run a dialog button action after the current click finishes bubbling. */
export function runDialogButtonAction(
  event: MouseEvent<HTMLElement>,
  action: () => void,
): void {
  event.preventDefault();
  event.stopPropagation();
  queueMicrotask(action);
}
