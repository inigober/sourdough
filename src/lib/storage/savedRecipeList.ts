import type { SavedRecipeSummary } from './types.ts';

/** How many recipes the compact "Saved recipes" shortcut on Home lists. */
export const HOME_SHORTCUT_RECIPE_COUNT = 3;

/** The Saved tab shows a search box only when it holds more recipes than this. */
export const SAVED_SEARCH_MIN_RECIPES = 8;

function updatedAtMillis(recipe: SavedRecipeSummary): number {
  const millis = Date.parse(recipe.updatedAt);
  return Number.isNaN(millis) ? Number.NEGATIVE_INFINITY : millis;
}

/** Newest first. Recipes with an unreadable date go last. Returns a new array. */
export function sortByRecentlyUpdated(recipes: readonly SavedRecipeSummary[]): SavedRecipeSummary[] {
  return [...recipes].sort((left, right) => {
    const leftMillis = updatedAtMillis(left);
    const rightMillis = updatedAtMillis(right);
    if (leftMillis === rightMillis) {
      return 0;
    }
    return rightMillis > leftMillis ? 1 : -1;
  });
}

export function pickMostRecentRecipes(
  recipes: readonly SavedRecipeSummary[],
  limit: number = HOME_SHORTCUT_RECIPE_COUNT,
): SavedRecipeSummary[] {
  return sortByRecentlyUpdated(recipes).slice(0, Math.max(0, limit));
}

export function shouldShowSavedRecipeSearch(recipeCount: number): boolean {
  return recipeCount > SAVED_SEARCH_MIN_RECIPES;
}

/** Case-insensitive match on name and bread style. An empty query keeps every recipe. */
export function filterSavedRecipes(
  recipes: readonly SavedRecipeSummary[],
  query: string,
): SavedRecipeSummary[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [...recipes];
  }

  return recipes.filter((recipe) =>
    `${recipe.name} ${recipe.breadStyle}`.toLowerCase().includes(normalizedQuery),
  );
}
