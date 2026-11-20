/**
 * Sentence read out by a screen reader after a search or filter changes a list
 * ("3 bakes shown", "No bakes match"). Sighted users see the list change; this tells everyone else.
 */
export function describeResultCount(count: number, singular: string, plural = `${singular}s`): string {
  if (count <= 0) {
    return `No ${plural} match`;
  }

  return `${count} ${count === 1 ? singular : plural} shown`;
}
