import { formatRecipeBakeStats, type RecipeBakeStats } from '../../lib/history/recipeBakeStats.ts';
import type { SavedRecipeSummary } from '../../lib/storage/types.ts';
import { formatSavedDate } from './formatSavedDate.ts';

/**
 * One short muted line under a recipe name, on Home and on the Saved tab. The schedule label is
 * dropped when there is a schedule (it is the same on almost every recipe and would push the useful
 * part off the end); a recipe without one says so.
 */
export function buildSavedRecipeMetaLine(recipe: SavedRecipeSummary, stats: RecipeBakeStats | undefined): string {
  const detail = stats ? formatRecipeBakeStats(stats) : `Updated ${formatSavedDate(recipe.updatedAt)}`;
  return recipe.hasSchedule ? detail : `${recipe.scheduleLabel} · ${detail}`;
}
