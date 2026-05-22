/** Layout tokens mirrored in styles.css — keep in sync when changing mobile form layout. */
export const MOBILE_LAYOUT = {
  /** Input column width inside the flour % control (stepper sits inside). */
  flourPercentControlWidth: '5.5rem',
  flourPercentStepperWidth: '2.25rem',
  mixDayFormClass: 'schedule-mix-form',
  mixDayDateTimeInputSelector: '.field-card input[type="date"],\n.field-card input[type="time"]',
} as const;

export function flourPercentControlFitsTwoDigits(controlWidth: string, stepperWidth: string): boolean {
  const widthMatch = controlWidth.match(/^([\d.]+)rem$/);
  const stepperMatch = stepperWidth.match(/^([\d.]+)rem$/);
  if (!widthMatch || !stepperMatch) {
    return false;
  }

  const totalRem = Number(widthMatch[1]);
  const stepperRem = Number(stepperMatch[1]);
  const digitAreaRem = totalRem - stepperRem;

  return totalRem >= 5.25 && totalRem <= 5.75 && digitAreaRem >= 2.75;
}
