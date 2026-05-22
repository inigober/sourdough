export function getStepDecimalPlaces(step: number): number {
  if (!Number.isFinite(step)) {
    return 0;
  }

  const stepString = String(step);
  const decimalIndex = stepString.indexOf('.');
  return decimalIndex === -1 ? 0 : stepString.length - decimalIndex - 1;
}

export function stepNumberValue(value: number, delta: number, step: number): number {
  const decimals = getStepDecimalPlaces(step);
  const factor = 10 ** decimals;
  return (Math.round(value * factor) + Math.round(delta * factor)) / factor;
}

export function formatNumberDraft(value: number, step: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const decimals = getStepDecimalPlaces(step);
  if (decimals === 0) {
    return String(Math.round(value));
  }

  return value.toFixed(decimals);
}
