import { useEffect, useRef, type RefObject } from 'react';

import { getSheetDragOffset, shouldDismissSheet } from './sheetDrag.ts';

const INTERACTIVE = 'button, a, input, textarea, select, summary, label';

/**
 * Lets the baker pull a bottom sheet down by its header to close it (the grabber is the hint).
 * Only the header starts a drag, and never from a control inside it, so scrolling the content and
 * tapping buttons are unaffected. Close button, Escape and the scrim stay as the non-gesture ways out.
 * With reduced motion the sheet does not animate back; it just returns.
 */
export function useSheetDrag(
  sheetRef: RefObject<HTMLElement | null>,
  headerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
): void {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const sheet = sheetRef.current;
    const header = headerRef.current;
    if (!sheet || !header) {
      return;
    }

    let startY = 0;
    let startedAt = 0;
    let offset = 0;
    let pointerId: number | null = null;

    header.style.touchAction = 'none'; // the browser must not scroll while the header is dragged

    const settle = (): void => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      sheet.style.transition = reduceMotion ? 'none' : 'transform 200ms ease-out';
      sheet.style.transform = '';
    };

    const onPointerDown = (event: PointerEvent): void => {
      if (pointerId !== null || (event.target instanceof Element && event.target.closest(INTERACTIVE))) {
        return;
      }
      pointerId = event.pointerId;
      startY = event.clientY;
      startedAt = event.timeStamp;
      offset = 0;
      sheet.style.transition = 'none';
      header.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerId !== pointerId) {
        return;
      }
      offset = getSheetDragOffset(event.clientY - startY);
      sheet.style.transform = `translateY(${offset}px)`;
    };

    const finish = (event: PointerEvent, cancelled: boolean): void => {
      if (event.pointerId !== pointerId) {
        return;
      }
      pointerId = null;
      const dismiss =
        !cancelled &&
        shouldDismissSheet({
          offsetPx: offset,
          durationMs: event.timeStamp - startedAt,
          sheetHeightPx: sheet.getBoundingClientRect().height,
        });
      if (dismiss) {
        onDismissRef.current();
      } else {
        settle();
      }
    };

    const onPointerUp = (event: PointerEvent): void => finish(event, false);
    const onPointerCancel = (event: PointerEvent): void => finish(event, true);

    header.addEventListener('pointerdown', onPointerDown);
    header.addEventListener('pointermove', onPointerMove);
    header.addEventListener('pointerup', onPointerUp);
    header.addEventListener('pointercancel', onPointerCancel);

    return () => {
      header.removeEventListener('pointerdown', onPointerDown);
      header.removeEventListener('pointermove', onPointerMove);
      header.removeEventListener('pointerup', onPointerUp);
      header.removeEventListener('pointercancel', onPointerCancel);
      header.style.touchAction = '';
      sheet.style.transform = '';
      sheet.style.transition = '';
    };
  }, [sheetRef, headerRef]);
}
