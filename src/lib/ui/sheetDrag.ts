/** Rules for dragging a bottom sheet down to close it. The gesture itself is in `useSheetDrag`. */

/** Share of the sheet's height it must be pulled down for a slow drag to close it. */
const DISMISS_FRACTION = 0.3;
/** A quick flick closes the sheet at this speed (pixels per millisecond) once it has moved a little. */
const FLICK_SPEED_PX_PER_MS = 0.5;
const FLICK_MIN_DISTANCE_PX = 40;

/** How far the sheet follows the finger: down only, never above its resting place. */
export function getSheetDragOffset(deltaYPx: number): number {
  return Math.max(0, deltaYPx);
}

export function shouldDismissSheet(drag: { offsetPx: number; durationMs: number; sheetHeightPx: number }): boolean {
  const { offsetPx, durationMs, sheetHeightPx } = drag;

  if (offsetPx <= 0) {
    return false;
  }

  if (offsetPx >= sheetHeightPx * DISMISS_FRACTION) {
    return true;
  }

  return durationMs > 0 && offsetPx >= FLICK_MIN_DISTANCE_PX && offsetPx / durationMs >= FLICK_SPEED_PX_PER_MS;
}
