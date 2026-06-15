import type { BakeHistorySessionSummary, BakeSessionAssessment } from './types.ts';

export type BakeHistoryAssessmentFilter = 'all' | 'unset' | BakeSessionAssessment;

export function filterBakeHistoryEntries(
  entries: BakeHistorySessionSummary[],
  query: string,
  assessmentFilter: BakeHistoryAssessmentFilter,
): BakeHistorySessionSummary[] {
  const normalizedQuery = query.trim().toLowerCase();

  return entries.filter((entry) => {
    if (assessmentFilter === 'unset') {
      if (entry.overallAssessment) {
        return false;
      }
    } else if (assessmentFilter !== 'all' && entry.overallAssessment !== assessmentFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [entry.recipeName, entry.overallNotePreview ?? '']
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}
