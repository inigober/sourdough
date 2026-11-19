import { getLoafAssessmentLabel } from './assessment.ts';
import type { BakeHistorySessionSummary, BakeSessionAssessment } from './types.ts';

export type RecipeBakeStats = {
  bakeCount: number;
  lastCompletedAt: string;
  lastAssessment?: BakeSessionAssessment;
};

/** Groups history by saved recipe id. Bakes whose recipe is unknown or deleted are skipped. */
export function buildRecipeBakeStats(
  entries: readonly BakeHistorySessionSummary[],
): Record<string, RecipeBakeStats> {
  const stats: Record<string, RecipeBakeStats> = {};

  for (const entry of entries) {
    if (!entry.savedRecipeId) {
      continue;
    }

    const existing = stats[entry.savedRecipeId];
    if (!existing) {
      stats[entry.savedRecipeId] = {
        bakeCount: 1,
        lastCompletedAt: entry.completedAt,
        lastAssessment: entry.overallAssessment,
      };
      continue;
    }

    existing.bakeCount += 1;
    if (Date.parse(entry.completedAt) > Date.parse(existing.lastCompletedAt)) {
      existing.lastCompletedAt = entry.completedAt;
      existing.lastAssessment = entry.overallAssessment;
    }
  }

  return stats;
}

/** "Baked 3x · last: Great loaf"; the last part is left out when that bake was not assessed. */
export function formatRecipeBakeStats(stats: RecipeBakeStats): string {
  const label = getLoafAssessmentLabel(stats.lastAssessment);
  return label ? `Baked ${stats.bakeCount}x · last: ${label}` : `Baked ${stats.bakeCount}x`;
}
