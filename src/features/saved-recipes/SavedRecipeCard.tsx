import { formatRecipeBakeStats, type RecipeBakeStats } from '../../lib/history/recipeBakeStats.ts';
import type { SavedRecipeSummary } from '../../lib/storage/types.ts';
import { formatSavedDate } from './formatSavedDate.ts';

type SavedRecipeCardProps = {
  recipe: SavedRecipeSummary;
  bakeStats: RecipeBakeStats | undefined;
  onOpen: (id: string) => void;
  onStartBake: (id: string) => void;
  onDuplicate: (id: string) => void;
};

/** One saved recipe on the Saved tab. Delete lives on the recipe view, not here. */
export function SavedRecipeCard({ recipe, bakeStats, onOpen, onStartBake, onDuplicate }: SavedRecipeCardProps) {
  return (
    <li className="saved-recipe-card">
      <button type="button" className="saved-recipe-card__open" onClick={() => onOpen(recipe.id)}>
        <strong>{recipe.name}</strong>
        <span className="saved-recipe-card__meta">
          {recipe.scheduleLabel}
          <span className="saved-recipe-card__meta-sep" aria-hidden="true">
            ·
          </span>
          Updated {formatSavedDate(recipe.updatedAt)}
        </span>
        {bakeStats ? (
          <span className="saved-recipe-card__meta saved-recipe-card__bake-stats">
            {formatRecipeBakeStats(bakeStats)}
          </span>
        ) : null}
      </button>
      <div className="saved-recipe-card__actions">
        <div className="saved-recipe-card__buttons">
          {recipe.hasSchedule ? (
            <button
              type="button"
              className="button button--primary saved-recipe-card__bake"
              aria-label={`Start baking ${recipe.name}`}
              onClick={() => onStartBake(recipe.id)}
            >
              Start baking
            </button>
          ) : null}
          <button
            type="button"
            className="button button--secondary saved-recipe-card__duplicate"
            aria-label={`Duplicate ${recipe.name}`}
            onClick={() => onDuplicate(recipe.id)}
          >
            Duplicate
          </button>
        </div>
      </div>
    </li>
  );
}
