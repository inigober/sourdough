import { PlusIcon } from '../../../components/icons.tsx';
import { WelcomeTopBar } from '../../auth/WelcomeTopBar.tsx';
import { getTemplateImageSrc } from '../../../lib/recipe/templateImages.ts';
import { recipeTemplates } from '../../../lib/recipe/templates.ts';
import type { BuilderDraftSummary } from '../../../lib/storage/draftStorage.ts';
import type { RecipeBakeStats } from '../../../lib/history/recipeBakeStats.ts';
import type { BakeSession } from '../../../lib/companion/types.ts';
import type { SavedRecipeSummary } from '../../../lib/storage/types.ts';
import { formatSavedDate } from '../../saved-recipes/formatSavedDate.ts';
import { SavedRecipesShortcut } from '../../saved-recipes/SavedRecipesShortcut.tsx';

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
  onOpenSaved: () => void;
  onOpenAuth: () => void;
  onStartBake: (id: string) => void;
  recipeBakeStats: Record<string, RecipeBakeStats>;
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
  onOpenSaved,
  onOpenAuth,
  onStartBake,
  recipeBakeStats,
  onRetrySavedRecipes,
}: WelcomeStepProps) {
  // One filled primary action per screen: when a resume card is showing, it owns the filled button.
  const hasResumeCard = Boolean(draftSummary || resumableBakeSession);
  const createButtonClass = hasResumeCard
    ? 'button button--secondary welcome-screen__create'
    : 'button button--primary welcome-screen__create';
  // No saved recipes: no shortcut at all. The Saved tab explains the empty state.
  const showSavedShortcut = savedRecipes.length > 0 || Boolean(savedRecipesError);

  const savedRecipesShortcut = showSavedShortcut ? (
    <SavedRecipesShortcut
      savedRecipes={savedRecipes}
      savedRecipesError={savedRecipesError}
      recipeBakeStats={recipeBakeStats}
      onSeeAll={onOpenSaved}
      onOpenRecipe={onLoadRecipe}
      onStartBake={onStartBake}
      onRetry={onRetrySavedRecipes}
    />
  ) : null;

  const templatesSection = (
    <section className="welcome-templates"aria-label="Recipe templates">
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
  );

  return (
    <div className="welcome-screen">
      {importMessage ? (
        <p className="welcome-import-message" role="status" aria-live="polite">
          {importMessage}
        </p>
      ) : null}

      <section className="hero welcome-screen__hero">
        <div className="welcome-screen__title-row">
          <h1>Plan your sourdough bake</h1>
          <WelcomeTopBar onOpenAuth={onOpenAuth} variant="inline" />
        </div>
        <p className="hero-copy">
          Hour by hour, with alerts when it is time to act. Start from a template or build your own recipe.
        </p>
        <button type="button" className={createButtonClass} onClick={onStart}>
          <PlusIcon />
          New recipe
        </button>
      </section>

      {draftSummary ? (
        <section className="card welcome-draft" aria-label="Resume draft">
          <div className="welcome-section__header">
            <h2>Continue where you left off</h2>
            <p className="section-copy">
              {draftSummary.label} · updated {formatSavedDate(draftSummary.updatedAt)}
            </p>
          </div>
          <button type="button" className="button button--primary welcome-draft__resume" onClick={onResumeDraft}>
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
            className="button button--primary welcome-bake-session__resume"
            onClick={onResumeBake}
          >
            Continue baking
          </button>
        </section>
      ) : null}

      {savedRecipesShortcut}
      {templatesSection}
    </div>
  );
}
