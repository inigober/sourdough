/** Anything with the standard `inert` flag (an HTMLElement in the browser, a plain object in tests). */
export type InertTarget = { inert: boolean };

type InertHold = { holders: number; wasInert: boolean };

const holds = new WeakMap<InertTarget, InertHold>();

/**
 * Makes the page behind a modal sheet unreachable for screen readers, switch control and the
 * keyboard. Holds are counted per element, so a sheet opened on top of another sheet (sign-in over
 * the coach) restores things in the right order: an element becomes interactive again only when the
 * last sheet that needed it inert is gone.
 *
 * Returns a function that releases this hold. Calling it twice is harmless.
 */
export function holdInert(targets: readonly InertTarget[]): () => void {
  for (const target of targets) {
    const hold = holds.get(target);
    if (hold) {
      hold.holders += 1;
    } else {
      holds.set(target, { holders: 1, wasInert: target.inert });
    }
    target.inert = true;
  }

  let released = false;

  return () => {
    if (released) {
      return;
    }
    released = true;

    for (const target of targets) {
      const hold = holds.get(target);
      if (!hold) {
        continue;
      }

      hold.holders -= 1;
      if (hold.holders <= 0) {
        target.inert = hold.wasInert;
        holds.delete(target);
      }
    }
  };
}
