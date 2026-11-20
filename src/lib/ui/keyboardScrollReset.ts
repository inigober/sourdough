/**
 * On an iPhone, focusing a text field makes the web view pan the page so the field stays above the
 * keyboard. When the keyboard closes the page stays panned, so headings end up under the sticky header.
 * This remembers where the page was when a text field got focus and puts it back once focus has left
 * the text fields. Touch devices only: on desktop a click-away must never move the page.
 */

type TextEntryCandidate = { tagName: string; type?: string; isContentEditable?: boolean } | null;

// Input types that open the keyboard. Date, time, checkbox, range and the like open pickers or nothing.
const KEYBOARD_INPUT_TYPES = new Set(['text', 'search', 'email', 'tel', 'url', 'password', 'number', '']);

export function isTextEntryElement(element: TextEntryCandidate): boolean {
  if (!element) {
    return false;
  }

  if (element.isContentEditable || element.tagName === 'TEXTAREA') {
    return true;
  }

  return element.tagName === 'INPUT' && KEYBOARD_INPUT_TYPES.has(element.type ?? '');
}

type FocusEventLike = { target: unknown };

type KeyboardScrollResetEnvironment = {
  document: {
    activeElement: unknown;
    addEventListener(type: string, listener: (event: FocusEventLike) => void, capture?: boolean): void;
    removeEventListener(type: string, listener: (event: FocusEventLike) => void, capture?: boolean): void;
  };
  window: { scrollY: number; scrollTo(x: number, y: number): void };
  isTouchDevice: boolean;
  /** Runs the callback after the keyboard has had time to start closing. */
  runLater(callback: () => void): void;
};

export function installKeyboardScrollReset(environment: KeyboardScrollResetEnvironment): () => void {
  const { document: doc, window: win, isTouchDevice, runLater } = environment;

  if (!isTouchDevice) {
    return () => {};
  }

  let scrollYBeforeFocus: number | null = null;

  const handleFocusIn = (event: FocusEventLike): void => {
    if (!isTextEntryElement(event.target as TextEntryCandidate)) {
      return;
    }

    // Moving between two text fields keeps the position from before the first one.
    if (scrollYBeforeFocus === null) {
      scrollYBeforeFocus = win.scrollY;
    }
  };

  const handleFocusOut = (event: FocusEventLike): void => {
    if (!isTextEntryElement(event.target as TextEntryCandidate)) {
      return;
    }

    runLater(() => {
      // Focus moved to another text field: the keyboard stays open, so leave the page alone.
      if (isTextEntryElement(doc.activeElement as TextEntryCandidate)) {
        return;
      }

      const target = scrollYBeforeFocus;
      scrollYBeforeFocus = null;
      if (target !== null && win.scrollY !== target) {
        win.scrollTo(0, target);
      }
    });
  };

  doc.addEventListener('focusin', handleFocusIn);
  doc.addEventListener('focusout', handleFocusOut);

  return () => {
    doc.removeEventListener('focusin', handleFocusIn);
    doc.removeEventListener('focusout', handleFocusOut);
  };
}

const KEYBOARD_CLOSE_DELAY_MS = 150;

/** The browser wiring. Kept out of the tested function so that one stays free of globals. */
export function installKeyboardScrollResetInBrowser(): () => void {
  return installKeyboardScrollReset({
    document,
    window,
    isTouchDevice: window.matchMedia('(pointer: coarse)').matches,
    runLater: (callback) => {
      window.setTimeout(callback, KEYBOARD_CLOSE_DELAY_MS);
    },
  });
}
