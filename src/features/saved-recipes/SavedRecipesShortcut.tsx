import { formatRecipeBakeStats, type RecipeBakeStats } from '../../lib/history/recipeBakeStats.ts';
import { pickMostRecentRecipes } from '../../lib/storage/savedRecipeList.ts';
import type { SavedRecipeSummary } from '../../lib/storage/types.ts';
import { formatSavedDate } from './formatSavedDate.ts';

type SavedRecipesShortcutProps = {
  savedRecipes: SavedRecipeSummary[];
  savedRecipesError: string | null;
  recipeBakeStats: Record<string, RecipeBakeStats>;
  onSeeAll: () => void;
  onOpenRecipe: (id: string) => void;
  onStartBake: (id: string) => void;
  onRetry: () => void;
};

/** Compact card on Home: the count plus the few most recently updated recipes. The full list is the Saved tab. */
export function SavedRecipesShortcut({
  savedRecipes,
  savedRecipesError,
  recipeBakeStats,
  onSeeAll,
  onOpenRecipe,
  onStartBake,
  onRetry,
}: SavedRecipesShortcutProps) {
  const recentRecipes = pickMostRecentRecipes(savedRecipes);
  const count = savedRecipes.length;

  return (
    <section className="card saved-shortcut" aria-label="Saved recipes">
      <div className="saved-shortcut__header">
        <div className="welcome-section__header">
          <h2>Saved recipes</h2>
          {count > 0 ? <p className="section-copy">{count === 1 ? '1 recipe' : `${count} recipes`}</p> : null}
        </div>
        <button type="button" className="page-shell__secondary-link" onClick={onSeeAll}>
          See all
        </button>
      </div>

      {savedRecipesError ? (
        <div className="saved-recipes__error" role="alert">
          <p className="auth-modal__error">{savedRecipesError}</p>
          <button type="button" className="button button--secondary" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}

      {recentRecipes.length > 0 ? (
        <ul className="saved-shortcut__list">
          {recentRecipes.map((recipe) => {
            const stats = recipeBakeStats[recipe.id];

            return (
              <li key={recipe.id} className="saved-shortcut-row">
                <button type="button" className="saved-shortcut-row__open" onClick={() => onOpenRecipe(recipe.id)}>
                  <strong>{recipe.name}</strong>
                  <span className="saved-shortcut-row__meta">{buildMetaLine(recipe, stats)}</span>
                </button>
                {recipe.hasSchedule ? (
                  <button
                    type="button"
                    className="button button--secondary saved-shortcut-row__bake"
                    aria-label={`Start baking ${recipe.name}`}
                    onClick={() => onStartBake(recipe.id)}
                  >
                    Start baking
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * One short line under the name. The schedule label is dropped when there is a schedule (it is the
 * same on almost every recipe and would push the useful part off the end); a recipe without one says so.
 */
function buildMetaLine(recipe: SavedRecipeSummary, stats: RecipeBakeStats | undefined): string {
  const detail = stats ? formatRecipeBakeStats(stats) : `Updated ${formatSavedDate(recipe.updatedAt)}`;
  return recipe.hasSchedule ? detail : `${recipe.scheduleLabel} · ${detail}`;
}
