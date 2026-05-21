/** Layout tokens mirrored in styles.css — keep in sync when changing mobile form layout. */
export const MOBILE_LAYOUT = {
  /** Total width of the % control: stepper column + room for two digits. */
  flourPercentControlWidth: '6.25rem',
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

  return totalRem >= 6 && totalRem <= 6.5 && digitAreaRem >= 2.25;
}
