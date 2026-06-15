import { BinIcon, PlusIcon } from '../../../components/icons.tsx';
import { WelcomeTopBar } from '../../auth/WelcomeTopBar.tsx';
import { getTemplateImageSrc } from '../../../lib/recipe/templateImages.ts';
import { recipeTemplates } from '../../../lib/recipe/templates.ts';
import type { BuilderDraftSummary } from '../../../lib/storage/draftStorage.ts';
import type { BakeSession } from '../../../lib/companion/types.ts';
import type { SavedRecipeSummary } from '../../../lib/storage/types.ts';
type WelcomeStepProps = {
  savedRecipes: SavedRecipeSummary[];
  savedRecipesError: string | null;
  draftSummary: BuilderDraftSummary | null;
  resumableBakeSession: BakeSession | null;
  importMessage: string | null;
  onStart: () => void;
  onResumeDraft: () => void;
  onResumeBake: () => void;
  onLoadTemplate: (templateId: string) => void;
  onLoadRecipe: (id: string) => void;
  onDuplicateRecipe: (id: string) => void;
  onDeleteRecipe: (id: string) => void;
  onOpenAuth: () => void;
  onStartBake: (id: string) => void;
  onRetrySavedRecipes: () => void;
};

export function WelcomeStep({
  savedRecipes,
  savedRecipesError,
  draftSummary,
  resumableBakeSession,
  importMessage,
  onStart,
  onResumeDraft,
  onResumeBake,
  onLoadTemplate,
  onLoadRecipe,
  onDuplicateRecipe,
  onDeleteRecipe,
  onOpenAuth,
  onStartBake,
  onRetrySavedRecipes,
}: WelcomeStepProps) {
  return (
    <div className="welcome-screen">
      {importMessage ? (
        <p className="welcome-import-message" role="status" aria-live="polite">
          {importMessage}
        </p>
      ) : null}

      <section className="hero welcome-screen__hero">
        <div className="welcome-screen__title-row">
          <h1>Sourdough recipe builder</h1>
          <WelcomeTopBar onOpenAuth={onOpenAuth} variant="inline" />
        </div>
        <p className="hero-copy">
          Build a recipe, review ingredients, plan your bake schedule, and save loaves to come back to.
          Start from scratch, a template, or where you left off.
        </p>
      </section>

      {draftSummary ? (
        <section className="card welcome-draft" aria-label="Resume draft">
          <div className="welcome-section__header">
            <h2>Continue where you left off</h2>
            <p className="section-copy">
              {draftSummary.label} · updated {formatSavedDate(draftSummary.updatedAt)}
            </p>
          </div>
          <button type="button" className="wizard-button wizard-button--primary welcome-draft__resume" onClick={onResumeDraft}>
            Resume
          </button>
        </section>
      ) : null}

      {resumableBakeSession ? (
        <section className="card welcome-bake-session" aria-label="Resume baking">
          <div className="welcome-section__header">
            <h2>Resume baking</h2>
            <p className="section-copy">
              {resumableBakeSession.recipeName} · step {resumableBakeSession.currentStepIndex + 1} · updated{' '}
              {formatSavedDate(resumableBakeSession.updatedAt)}
            </p>
          </div>
          <button
            type="button"
            className="wizard-button wizard-button--primary welcome-bake-session__resume"
            onClick={onResumeBake}
          >
            Continue baking
          </button>
        </section>
      ) : null}

      <section className="card saved-recipes" aria-label="Saved recipes">
        <div className="welcome-section__header saved-recipes__header">
          <h2>Saved recipes</h2>
          <p className="section-copy">Open a saved recipe or duplicate it as a starting point.</p>
        </div>
        {savedRecipesError ? (
          <div className="saved-recipes__error" role="alert">
            <p className="auth-modal__error">{savedRecipesError}</p>
            <button type="button" className="wizard-button wizard-button--secondary" onClick={onRetrySavedRecipes}>
              Try again
            </button>
          </div>
        ) : null}
        {savedRecipes.length > 0 ? (
          <ul className="saved-recipes__list">
            {savedRecipes.map((recipe) => (
              <li key={recipe.id} className="saved-recipe-card">
                <button
                  type="button"
                  className="saved-recipe-card__open"
                  onClick={() => onLoadRecipe(recipe.id)}
                >
                  <strong>{recipe.name}</strong>
                  <span className="saved-recipe-card__meta">
                    Bake on {recipe.bakeDateLabel}
                    <span className="saved-recipe-card__meta-sep" aria-hidden="true">
                      ·
                    </span>
                    Updated {formatSavedDate(recipe.updatedAt)}
                  </span>
                </button>
                <div className="saved-recipe-card__actions">
                  <div className="saved-recipe-card__buttons">
                    {recipe.hasSchedule ? (
                      <button
                        type="button"
                        className="wizard-button wizard-button--primary saved-recipe-card__bake"
                        onClick={() => onStartBake(recipe.id)}
                      >
                        Start baking
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="wizard-button wizard-button--secondary saved-recipe-card__duplicate"
                      onClick={() => onDuplicateRecipe(recipe.id)}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--delete saved-recipe-card__delete"
                      aria-label={`Delete ${recipe.name}`}
                      onClick={() => onDeleteRecipe(recipe.id)}
                    >
                      <BinIcon />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="saved-recipes__empty">No saved recipes yet.</p>
        )}
        <button type="button" className="saved-recipes__create wizard-button wizard-button--secondary" onClick={onStart}>
          <PlusIcon />
          New recipe from scratch
        </button>
      </section>

      <section className="card welcome-templates" aria-label="Recipe templates">
        <div className="welcome-section__header">
          <h2>Start from a template</h2>
          <p className="section-copy">Six common bakes with sensible defaults you can adjust in the wizard.</p>
        </div>
        <ul className="welcome-templates__list">
          {recipeTemplates.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                className="welcome-template-card"
                onClick={() => onLoadTemplate(template.id)}
              >
                <img
                  className="welcome-template-card__image"
                  src={getTemplateImageSrc(template.id)}
                  alt=""
                  loading="lazy"
                  width={240}
                  height={160}
                />
                <span className="welcome-template-card__body">
                  <strong>{template.name}</strong>
                  <span className="welcome-template-card__copy">{template.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

    </div>
  );
}

function formatSavedDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'recently';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
