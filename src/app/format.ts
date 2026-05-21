export function formatGrams(value: number): string {
  return `${Math.round(value)}g`;
}

export function formatGramsToNearest(value: number, nearest: number): string {
  return `${Math.round(value / nearest) * nearest}g`;
}
