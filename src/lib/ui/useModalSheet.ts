import { useEffect, useRef, type RefObject } from 'react';

import { FOCUSABLE_SELECTOR, getTrappedFocusIndex } from './focusTrap.ts';
import { holdInert } from './inertBackground.ts';

type UseModalSheetOptions = {
  /** Called on Escape. */
  onClose: () => void;
};

/**
 * Makes a custom modal sheet behave like a real dialog for keyboard, VoiceOver and Switch Control.
 * (Native <dialog> elements opened with showModal() get this from the browser; this is for the
 * sheets that are plain divs: the bake coach and the sign-in modal.)
 *
 * The sheet must be rendered into document.body (createPortal) so everything else on the page can
 * be switched off without switching off the sheet.
 *
 * - Focus moves into the sheet when it opens: to the element marked `data-modal-initial-focus`,
 *   otherwise to the first control. A heading is a good choice: VoiceOver reads it first.
 * - Tab and Shift+Tab stay inside the sheet.
 * - Escape closes it.
 * - The rest of the page is made `inert`, so VoiceOver cannot swipe into the page behind.
 * - When the sheet closes, focus returns to the control that opened it.
 */
export function useModalSheet(
  sheetRef: RefObject<HTMLElement | null>,
  { onClose }: UseModalSheetOptions,
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) {
      return;
    }

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const sheetRoot = sheet.closest('body > *');
    const background = Array.from(document.body.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== sheetRoot && !['SCRIPT', 'STYLE'].includes(element.tagName),
    );
    const releaseBackground = holdInert(background);

    const initialFocus = sheet.querySelector<HTMLElement>('[data-modal-initial-focus]');
    if (initialFocus) {
      if (!initialFocus.hasAttribute('tabindex')) {
        initialFocus.setAttribute('tabindex', '-1');
      }
      initialFocus.focus({ preventScroll: true });
    } else {
      sheet.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus({ preventScroll: true });
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !sheet) {
        return;
      }

      const focusable = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const currentIndex = focusable.findIndex((element) => element === document.activeElement);
      const nextIndex = getTrappedFocusIndex(currentIndex, focusable.length, event.shiftKey);

      if (nextIndex !== null) {
        event.preventDefault();
        focusable[nextIndex].focus();
      }
    }

    // On the sheet, not the document: when a second sheet opens on top, only that one reacts.
    sheet.addEventListener('keydown', handleKeyDown);

    return () => {
      sheet.removeEventListener('keydown', handleKeyDown);
      releaseBackground();
      if (opener && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [sheetRef]);
}
