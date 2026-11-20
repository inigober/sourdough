import type { RecipeBakeStats } from '../../lib/history/recipeBakeStats.ts';
import type { SavedRecipeSummary } from '../../lib/storage/types.ts';
import { buildSavedRecipeMetaLine } from './savedRecipeMetaLine.ts';

type SavedRecipeCardProps = {
  recipe: SavedRecipeSummary;
  bakeStats: RecipeBakeStats | undefined;
  onOpen: (id: string) => void;
  onStartBake: (id: string) => void;
  onDuplicate: (id: string) => void;
};

/**
 * One saved recipe on the Saved tab, drawn as a flat row (hairline between rows, no box per row).
 * Delete lives on the recipe view, not here.
 */
export function SavedRecipeCard({ recipe, bakeStats, onOpen, onStartBake, onDuplicate }: SavedRecipeCardProps) {
  return (
    <li className="saved-recipe-row">
      <button type="button" className="saved-recipe-row__open" onClick={() => onOpen(recipe.id)}>
        <strong className="saved-recipe-row__name">{recipe.name}</strong>
        <span className="saved-recipe-row__meta">{buildSavedRecipeMetaLine(recipe, bakeStats)}</span>
      </button>
      <div className="saved-recipe-row__actions">
        {recipe.hasSchedule ? (
          <button
            type="button"
            className="button button--primary saved-recipe-row__bake"
            aria-label={`Start baking ${recipe.name}`}
            onClick={() => onStartBake(recipe.id)}
          >
            Start baking
          </button>
        ) : null}
        <button
          type="button"
          className="button button--secondary saved-recipe-row__duplicate"
          aria-label={`Duplicate ${recipe.name}`}
          onClick={() => onDuplicate(recipe.id)}
        >
          Duplicate
        </button>
      </div>
    </li>
  );
}
