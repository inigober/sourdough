/** Layout tokens mirrored in styles.css — keep in sync when changing mobile form layout. */
export const MOBILE_LAYOUT = {
  /** Min width of the % pill between minus/plus controls. */
  flourPercentPillMinWidth: '4.5rem',
  /** Shared height of minus button, % pill, and plus button. */
  flourPercentControlSize: '2.35rem',
  mixDayFormClass: 'schedule-mix-form',
  mixDayDateTimeInputSelector: '.field-card input[type="date"],\n.field-card input[type="time"]',
} as const;

export function flourPercentControlFitsTwoDigits(pillMinWidth: string, controlSize: string): boolean {
  const widthMatch = pillMinWidth.match(/^([\d.]+)rem$/);
  const sizeMatch = controlSize.match(/^([\d.]+)rem$/);
  if (!widthMatch || !sizeMatch) {
    return false;
  }

  const pillMinWidthRem = Number(widthMatch[1]);
  const controlSizeRem = Number(sizeMatch[1]);

  return pillMinWidthRem >= 4.25 && controlSizeRem >= 2.25;
}
