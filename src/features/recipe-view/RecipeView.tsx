import { useEffect, useMemo, useState } from 'react';

import { AppHeader } from '../../components/AppHeader.tsx';
import { LoafIcon, PenIcon } from '../../components/icons.tsx';
import { PageShell } from '../../components/PageShell.tsx';
import { RecipeCard } from '../../components/RecipeCard.tsx';
import { StickyFooter } from '../../components/StickyFooter.tsx';
import { buildRecipeOverview } from '../../lib/recipe/buildRecipeOverview.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import type { SavedRecipe } from '../../lib/storage/types.ts';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; recipe: SavedRecipe }
  | { status: 'missing' }
  | { status: 'error'; message: string };

type RecipeViewProps = {
  recipeId: string;
  fetchSavedRecipe: (id: string) => Promise<SavedRecipe | null>;
  onHome: () => void;
  onEdit: (recipe: SavedRecipe) => void;
  onStartBake: (recipe: SavedRecipe & { scheduleInput: ScheduleInput }) => void;
};

/** Read-only look at a saved recipe: ingredients, starter and levain amounts, and the schedule. */
export function RecipeView({ recipeId, fetchSavedRecipe, onHome, onEdit, onStartBake }: RecipeViewProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let isCurrent = true;
    setLoadState({ status: 'loading' });

    fetchSavedRecipe(recipeId)
      .then((recipe) => {
        if (isCurrent) {
          setLoadState(recipe ? { status: 'ready', recipe } : { status: 'missing' });
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          const message = error instanceof Error ? error.message : 'Failed to load recipe.';
          setLoadState({ status: 'error', message });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [fetchSavedRecipe, recipeId]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [recipeId]);

  if (loadState.status !== 'ready') {
    return (
      <>
        <AppHeader onHome={onHome} title="Recipe" />
        <PageShell className="recipe-view">
          <section className="card card--notice" role={loadState.status === 'loading' ? 'status' : 'alert'}>
            {loadState.status === 'loading' ? <p>Loading recipe…</p> : null}
            {loadState.status === 'missing' ? <p>This recipe could not be found. It may have been deleted.</p> : null}
            {loadState.status === 'error' ? <p>{loadState.message}</p> : null}
          </section>
        </PageShell>
      </>
    );
  }

  return (
    <RecipeViewContent
      recipe={loadState.recipe}
      onHome={onHome}
      onEdit={onEdit}
      onStartBake={onStartBake}
    />
  );
}

type RecipeViewContentProps = {
  recipe: SavedRecipe;
  onHome: () => void;
  onEdit: (recipe: SavedRecipe) => void;
  onStartBake: (recipe: SavedRecipe & { scheduleInput: ScheduleInput }) => void;
};

function RecipeViewContent({ recipe, onHome, onEdit, onStartBake }: RecipeViewContentProps) {
  const overview = useMemo(
    () => buildRecipeOverview(recipe.recipeInput, recipe.scheduleInput),
    [recipe.recipeInput, recipe.scheduleInput],
  );
  const bakeableRecipe = recipe.scheduleInput ? { ...recipe, scheduleInput: recipe.scheduleInput } : null;

  return (
    <>
      <AppHeader onHome={onHome} title={recipe.name} />
      <PageShell
        className="recipe-view"
        footer={
          <StickyFooter
            secondaryAction={
              <button type="button" className="page-shell__secondary-link" onClick={() => onEdit(recipe)}>
                <PenIcon />
                Edit recipe
              </button>
            }
          >
            <nav className="wizard-nav" aria-label="Recipe actions">
              <button
                type="button"
                className="wizard-button wizard-button--primary wizard-button--block"
                disabled={!bakeableRecipe}
                onClick={() => bakeableRecipe && onStartBake(bakeableRecipe)}
              >
                <LoafIcon />
                Start baking
              </button>
            </nav>
          </StickyFooter>
        }
      >
        <section className="hero recipe-view__hero">
          <p className="hero-copy">{overview.doughSummary}</p>
        </section>

        {overview.ingredientRows.length > 0 ? (
          <div className="summary-grid recipe-view__amounts">
            <RecipeCard title="Ingredients" rows={overview.ingredientRows} />
            <RecipeCard title="Starter and levain" rows={overview.levainRows} />
          </div>
        ) : (
          <section className="card card--notice">
            <h2>Ingredients unavailable</h2>
            <p>The saved inputs no longer produce a valid formula. Edit the recipe to fix them.</p>
          </section>
        )}

        <section className="card recipe-view__schedule" aria-label="Schedule">
          <h2>Schedule</h2>
          {overview.schedule ? (
            <>
              <p className="section-copy">
                {overview.schedule.mixDaySummary}. Times follow a {overview.schedule.startTime} start. You will
                pick the real date and time when you start baking.
              </p>
              {overview.schedule.days.map((day) => (
                <div key={day.label} className="recipe-view__day">
                  <h3 className="recipe-view__day-label">{day.label}</h3>
                  <ol className="recipe-view__steps">
                    {day.steps.map((step) => (
                      <li key={step.id} className="recipe-view__step">
                        <span className="recipe-view__step-time">{step.time}</span>
                        <span className="recipe-view__step-label">{step.label}</span>
                        {step.duration ? <span className="recipe-view__step-duration">{step.duration}</span> : null}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </>
          ) : (
            <p className="section-copy">No schedule saved yet. Edit the recipe and build one to start baking.</p>
          )}
        </section>
      </PageShell>
    </>
  );
}
