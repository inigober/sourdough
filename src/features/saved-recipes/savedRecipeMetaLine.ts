import { buildBakeSummaryLine } from '../../lib/history/bakeSummaryLine.ts';
import { formatRecipeBakeStats, type RecipeBakeStats } from '../../lib/history/recipeBakeStats.ts';
import type { SavedRecipeSummary } from '../../lib/storage/types.ts';
import { formatSavedDate } from './formatSavedDate.ts';

/**
 * One short muted line under a recipe name, on Home and on the Saved tab: the recipe's own numbers
 * first (hydration, dough size, flour), then how often it was baked or when it was last updated.
 * The schedule label is dropped when there is a schedule (it is the same on almost every recipe and
 * would push the useful part off the end); a recipe without one says so.
 */
export function buildSavedRecipeMetaLine(recipe: SavedRecipeSummary, stats: RecipeBakeStats | undefined): string {
  const detail = stats ? formatRecipeBakeStats(stats) : `Updated ${formatSavedDate(recipe.updatedAt)}`;
  const parts = [buildBakeSummaryLine(recipe.recipeFacts), recipe.hasSchedule ? '' : recipe.scheduleLabel, detail];
  return parts.filter(Boolean).join(' · ');
}
