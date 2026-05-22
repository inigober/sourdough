import type { ReactNode } from 'react';

import { PageShell } from '../../components/PageShell.tsx';
import { StickyFooter } from '../../components/StickyFooter.tsx';
import { SaveIcon } from '../../components/icons.tsx';
import { InfoToggle } from '../../components/InfoToggle.tsx';
import {
  ClockIcon,
  PenIcon,
  ScaleIcon,
  WaterIcon,
  WheatIcon,
} from '../../components/icons.tsx';
import { RecipeAssessment } from '../../components/RecipeAssessment.tsx';
import { RecipeCard } from '../../components/RecipeCard.tsx';
import { assessmentInfo } from './fieldInfo.ts';
import { formatGrams, formatGramsToNearest } from '../../app/format.ts';
import { getFlourGrams } from '../../lib/recipe/flourBlend.ts';
import { buildIngredientRows } from '../../lib/recipe/formatIngredients.ts';
import { flourProfiles } from '../../lib/recipe/flourProfiles.ts';
import type { AssessmentSection, FlourBlendEntry, RecipeFormula, RecipeInput } from '../../lib/recipe/types.ts';
import { levainActivityOptions } from './recipeOptions.ts';
import type { RecipeBuilderStep } from './recipeBuilderSteps.ts';

type RecipeResultsViewProps = {
  recipeInput: RecipeInput;
  formula: RecipeFormula | null;
  assessmentSections: AssessmentSection[];
  onEditStep: (step: RecipeBuilderStep) => void;
  onBuildSchedule: () => void;
  onSave: () => void;
  isSavedRecipe: boolean;
};

export function RecipeResultsView({
  recipeInput,
  formula,
  assessmentSections,
  onEditStep,
  onBuildSchedule,
  onSave,
  isSavedRecipe,
}: RecipeResultsViewProps) {
  const levainActivityLabel =
    levainActivityOptions.find((option) => option.value === recipeInput.levainActivity)?.label ??
    recipeInput.levainActivity;
  const ingredientRows = formula ? buildIngredientRows(recipeInput, formula) : [];

  const formulaRows = formula
    ? ([
        ['Total flour', formula.totalFlourGrams],
        ['Total water', formula.totalWaterGrams],
        ['Levain flour', formula.levainFlourGrams],
        ['Levain water', formula.levainWaterGrams],
        ['Prefermented flour', `${formula.prefermentedFlourPercent}%`],
        [
          'Estimated baked loaf',
          `~${formatGramsToNearest(getEstimatedBakedLoafMidpoint(formula.estimatedBakedLoafWeightGrams), 50)}`,
        ],
      ] as const)
    : [];

  return (
    <PageShell
      className="recipe-results"
      footer={
        <StickyFooter
          secondaryAction={
            <button
              type="button"
              className="page-shell__secondary-link"
              onClick={onSave}
              disabled={!formula}
            >
              <SaveIcon />
              {isSavedRecipe ? 'Update recipe' : 'Save recipe'}
            </button>
          }
        >
          <nav className="wizard-nav" aria-label="Ingredient summary navigation">
            <button
              type="button"
              className="wizard-button wizard-button--primary wizard-button--block"
              onClick={onBuildSchedule}
              disabled={!formula}
            >
              Build schedule
            </button>
          </nav>
        </StickyFooter>
      }
    >
      <section className="hero recipe-results__hero">
        <h1>Ingredient summary</h1>
        <p className="hero-copy">
          Tap any section to adjust inputs. Ingredient weights update from your targets.
        </p>
      </section>

      <section className="summary-groups" aria-label="Recipe inputs summary">
        <SummaryGroup
          icon={<ScaleIcon />}
          title="Dough size"
          value={`${recipeInput.finalDoughWeightGrams}g · ${recipeInput.numberOfLoaves} loaf${recipeInput.numberOfLoaves === 1 ? '' : 'es'}`}
          onEdit={() => onEditStep('doughSize')}
        />
        <SummaryGroup
          icon={<WheatIcon />}
          title="Flour blend"
          onEdit={() => onEditStep('flour')}
          stackedLines={getFlourSummaryLines(recipeInput.doughFlours, formula?.totalFlourGrams ?? null)}
        />
        <SummaryGroup
          icon={<WaterIcon />}
          title="Hydration & salt"
          value={`${recipeInput.hydrationPercent}% hydration · ${recipeInput.saltPercent}% salt`}
          onEdit={() => onEditStep('recipeTargets')}
        />
        <SummaryGroup
          icon={<ClockIcon />}
          title="Fermentation & levain"
          value={`${recipeInput.targetBulkHours}h bulk · ${recipeInput.roomTemperatureCelsius}°C · ${levainActivityLabel}`}
          onEdit={() => onEditStep('fermentation')}
        />
      </section>

      <div className="recipe-results__calculated">
        <section className="summary-grid" aria-label="Calculated recipe summary">
          {formula ? (
            <>
              <RecipeCard title="Ingredient list" rows={ingredientRows} />
              <RecipeCard title="Formula breakdown" rows={formulaRows} />
            </>
          ) : (
            <section className="card card--notice">
              <h2>Formula unavailable</h2>
              <p>Fix blocking input errors, then return here to see the ingredient list.</p>
            </section>
          )}
        </section>

        <RecipeAssessment
          sections={assessmentSections}
          isUnavailable={!formula}
          info={assessmentInfo}
        />
      </div>
    </PageShell>
  );
}

function getFlourSummaryLines(
  doughFlours: FlourBlendEntry[],
  totalFlourGrams: number | null,
): string[] {
  return doughFlours
    .filter((entry) => entry.percent > 0)
    .map((entry) => {
      const label = flourProfiles[entry.flourType].label;
      if (totalFlourGrams === null) {
        return `${entry.percent}% ${label}`;
      }

      return `${entry.percent}% ${label} · ${formatGrams(getFlourGrams(entry.percent, totalFlourGrams))}`;
    });
}

type SummaryGroupProps = {
  icon: ReactNode;
  title: string;
  info?: string;
  value?: string;
  stackedLines?: string[];
  onEdit: () => void;
};

function SummaryGroup({ icon, title, info, value, stackedLines, onEdit }: SummaryGroupProps) {
  return (
    <div className="summary-group card">
      <div className="summary-group__header">
        <span className="summary-group__label">
          <span className="summary-group__icon" aria-hidden="true">
            {icon}
          </span>
          {title}
        </span>
        {info ? <InfoToggle label={title}>{info}</InfoToggle> : null}
      </div>
      <button type="button" className="summary-group__body" onClick={onEdit} aria-label={`Edit ${title}`}>
        <span className="summary-group__value-row">
          {stackedLines && stackedLines.length > 1 ? (
            <span className="summary-group__stack">
              {stackedLines.map((line) => (
                <span key={line} className="summary-group__stack-line">
                  {line}
                </span>
              ))}
            </span>
          ) : (
            <strong className="summary-group__value">{stackedLines?.[0] ?? value}</strong>
          )}
          <span className="summary-group__edit" aria-hidden="true">
            <PenIcon />
          </span>
        </span>
      </button>
    </div>
  );
}

function getEstimatedBakedLoafMidpoint(weightRange: { low: number; high: number }): number {
  return (weightRange.low + weightRange.high) / 2;
}
