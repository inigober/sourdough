import { useEffect } from 'react';

import { getDocumentTitle } from '../features/recipe-builder/documentTitle.ts';

type RouterLike = {
  state: { location: { pathname: string } };
  subscribe: (listener: (state: { location: { pathname: string } }) => void) => () => void;
};

/**
 * Two things a single-page app has to do by hand that a normal website gets for free.
 *
 * 1. Set the page title for each screen.
 * 2. After the screen changes, move focus to the new screen's heading. Without this, VoiceOver
 *    keeps its cursor on a button that no longer exists and says nothing about the new screen;
 *    with it, VoiceOver reads the heading ("Saved recipes, heading level 1").
 *
 * Focus is not moved on the first load, so the page does not grab focus from the browser chrome.
 */
export function useRouteAccessibility(router: RouterLike): void {
  useEffect(() => {
    let currentPathname = router.state.location.pathname;
    document.title = getDocumentTitle(currentPathname);

    return router.subscribe((state) => {
      const nextPathname = state.location.pathname;
      if (nextPathname === currentPathname) {
        return;
      }

      currentPathname = nextPathname;
      document.title = getDocumentTitle(nextPathname);
      moveFocusToScreenHeading();
    });
  }, [router]);
}

const FOCUS_GIVE_UP_MS = 1500;

function findScreenHeading(): HTMLElement | null {
  const main = document.querySelector<HTMLElement>('main');
  return main?.querySelector<HTMLElement>('h1, h2[aria-level="1"]') ?? main;
}

function focusHeading(heading: HTMLElement): void {
  // A heading is not focusable by default; -1 allows script focus without adding a Tab stop.
  if (!heading.hasAttribute('tabindex')) {
    heading.setAttribute('tabindex', '-1');
  }
  heading.focus({ preventScroll: true });
}

/**
 * Focuses the new screen's first level-1 heading. React Router renders a route change in a
 * transition, so the new screen can appear some time after the URL changes (about 300 ms in the
 * dev build, longer on a slow device). So this watches the page and focuses the heading as soon as
 * it is no longer the old screen's; after a few seconds it focuses whatever heading is there.
 */
function moveFocusToScreenHeading(): void {
  const main = document.querySelector<HTMLElement>('main');
  if (!main) {
    return;
  }

  const oldHeading = findScreenHeading();
  const oldText = oldHeading?.textContent ?? '';

  const finish = (): void => {
    observer.disconnect();
    window.clearTimeout(giveUpTimer);
  };

  const observer = new MutationObserver(() => {
    const heading = findScreenHeading();
    if (heading && (heading !== oldHeading || (heading.textContent ?? '') !== oldText)) {
      finish();
      focusHeading(heading);
    }
  });
  observer.observe(main, { childList: true, subtree: true, characterData: true });

  const giveUpTimer = window.setTimeout(() => {
    finish();
    const heading = findScreenHeading();
    if (heading) {
      focusHeading(heading);
    }
  }, FOCUS_GIVE_UP_MS);
}
