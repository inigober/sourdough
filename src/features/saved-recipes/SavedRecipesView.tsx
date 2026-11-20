import { useMemo, useState } from 'react';

import { PlusIcon, SearchIcon } from '../../components/icons.tsx';
import { ScreenChrome } from '../../components/ScreenChrome.tsx';
import type { RecipeBakeStats } from '../../lib/history/recipeBakeStats.ts';
import {
  filterSavedRecipes,
  shouldShowSavedRecipeSearch,
  sortByRecentlyUpdated,
} from '../../lib/storage/savedRecipeList.ts';
import type { SavedRecipeSummary } from '../../lib/storage/types.ts';
import { describeResultCount } from '../../lib/ui/resultCount.ts';
import { SavedRecipeCard } from './SavedRecipeCard.tsx';

type SavedRecipesViewProps = {
  savedRecipes: SavedRecipeSummary[];
  savedRecipesError: string | null;
  isLoading: boolean;
  recipeBakeStats: Record<string, RecipeBakeStats>;
  onNewRecipe: () => void;
  onOpenRecipe: (id: string) => void;
  onStartBake: (id: string) => void;
  onDuplicateRecipe: (id: string) => void;
  onRetry: () => void;
};

/** The Saved tab: every saved recipe, newest first. Search appears once the list gets long. */
export function SavedRecipesView({
  savedRecipes,
  savedRecipesError,
  isLoading,
  recipeBakeStats,
  onNewRecipe,
  onOpenRecipe,
  onStartBake,
  onDuplicateRecipe,
  onRetry,
}: SavedRecipesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const showSearch = shouldShowSavedRecipeSearch(savedRecipes.length);
  // A stale query must not keep filtering after recipes are deleted and the search box is gone.
  const activeQuery = showSearch ? searchQuery : '';

  const sortedRecipes = useMemo(() => sortByRecentlyUpdated(savedRecipes), [savedRecipes]);
  const visibleRecipes = useMemo(
    () => filterSavedRecipes(sortedRecipes, activeQuery),
    [activeQuery, sortedRecipes],
  );

  const isEmpty = savedRecipes.length === 0 && !isLoading && !savedRecipesError;

  return (
    <>
      <ScreenChrome title="Saved recipes" />
      <div className="welcome-screen saved-recipes-screen">
        <section className="card saved-recipes" aria-label="Saved recipes list">
          {savedRecipes.length > 0 ? (
            <p className="section-copy">
              Open a recipe, start a bake, or duplicate one as a starting point. Newest first.
            </p>
          ) : null}

          {savedRecipesError ? (
            <div className="saved-recipes__error" role="alert">
              <p className="auth-modal__error">{savedRecipesError}</p>
              <button type="button" className="wizard-button wizard-button--secondary" onClick={onRetry}>
                Try again
              </button>
            </div>
          ) : null}

          {isLoading && savedRecipes.length === 0 ? (
            <p className="saved-recipes__empty" role="status">
              Loading your recipes…
            </p>
          ) : null}

          {showSearch ? (
            <label className="field-card saved-recipes__search">
              <span className="field-label-row field-label-row--with-icon">
                <SearchIcon />
                <span>Search</span>
              </span>
              <input
                type="search"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                placeholder="Recipe name"
              />
            </label>
          ) : null}

          {savedRecipes.length > 0 && visibleRecipes.length === 0 ? (
            <p className="saved-recipes__empty" role="status">
              No saved recipes match your search.
            </p>
          ) : null}

          {/* Screen readers: say how many recipes the search left, since only the list changes on screen. */}
          {activeQuery && visibleRecipes.length > 0 ? (
            <p className="visually-hidden" role="status">
              {describeResultCount(visibleRecipes.length, 'recipe')}
            </p>
          ) : null}

          {visibleRecipes.length > 0 ? (
            <ul className="saved-recipes__list">
              {visibleRecipes.map((recipe) => (
                <SavedRecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  bakeStats={recipeBakeStats[recipe.id]}
                  onOpen={onOpenRecipe}
                  onStartBake={onStartBake}
                  onDuplicate={onDuplicateRecipe}
                />
              ))}
            </ul>
          ) : null}

          {isEmpty ? (
            <div className="saved-recipes__empty-state">
              <p className="saved-recipes__empty">
                No saved recipes yet. Build one and tap Save recipe at the end of the steps, and it will show up here.
              </p>
              <button
                type="button"
                className="wizard-button wizard-button--primary wizard-button--with-icon"
                onClick={onNewRecipe}
              >
                <PlusIcon />
                New recipe
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
