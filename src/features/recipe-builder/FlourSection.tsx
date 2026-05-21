import { InfoToggle } from '../../components/InfoToggle.tsx';
import { PenEditButton } from '../../components/PenEditButton.tsx';
import { SectionHeading } from '../../components/SectionHeading.tsx';
import { BinIcon } from '../../components/icons.tsx';
import {
  formatFlourBlendSummary,
  getFlourGrams,
  getRoundedTotalFlourGrams,
} from '../../lib/recipe/flourBlend.ts';
import { formatGrams } from '../../app/format.ts';
import type { FlourBlendEntry, FlourType, RecipeInput, RecipeValidationIssue } from '../../lib/recipe/types.ts';
import { fieldInfo } from './fieldInfo.ts';
import { flourOptions } from './recipeOptions.ts';
import { getFieldValidationProps } from './validationView.ts';

type FlourSectionProps = {
  recipeInput: RecipeInput;
  validationIssues: RecipeValidationIssue[];
  onFlourTypeChange: (entryId: string, flourType: FlourType) => void;
  onFlourPercentChange: (entryId: string, percent: number) => void;
  onFlourGramsChange: (entryId: string, grams: number, totalFlourGrams: number) => void;
  onFlourGramsStep: (entryId: string, delta: number, totalFlourGrams: number) => void;
  onAddFlour: () => void;
  onRemoveFlour: (entryId: string) => void;
  onEditDoughWeight: () => void;
};

export function FlourSection({
  recipeInput,
  validationIssues,
  onFlourTypeChange,
  onFlourPercentChange,
  onFlourGramsChange,
  onFlourGramsStep,
  onAddFlour,
  onRemoveFlour,
  onEditDoughWeight,
}: FlourSectionProps) {
  const totalFlourGrams = getRoundedTotalFlourGrams(recipeInput);
  const isMultiFlour = recipeInput.doughFlours.length > 1;
  const blendMessage = getFieldValidationProps(validationIssues, 'doughFlours');

  return (
    <section className="card">
      <SectionHeading
        title={formatFlourBlendSummary(recipeInput.doughFlours)}
        copy={
          isMultiFlour
            ? 'These flours share 100% of the total flour in your dough. Adjust % or grams on each row.'
            : 'Choose the flour in your dough. Hydration and salt come on the next step.'
        }
      />

      <div className="flour-context-strip">
        <div className="reference-chip reference-chip--static reference-chip--with-action">
          <span>Total dough weight</span>
          <span className="reference-chip__value-row">
            <strong>{recipeInput.finalDoughWeightGrams}g</strong>
            <PenEditButton label="Edit dough weight" onClick={onEditDoughWeight} />
          </span>
        </div>
        <div className="reference-chip reference-chip--static">
          <span className="reference-chip__label-row">
            <span>Total flour in recipe</span>
            <InfoToggle label="Total flour in recipe">{fieldInfo.totalFlourInRecipe}</InfoToggle>
          </span>
          <strong>{formatGrams(totalFlourGrams)}</strong>
        </div>
      </div>

      <form className="field-grid field-grid--stacked">
        <ul className="flour-blend-list">
          {recipeInput.doughFlours.map((entry) => (
            <FlourBlendRow
              key={entry.id}
              entry={entry}
              totalFlourGrams={totalFlourGrams}
              isMultiFlour={isMultiFlour}
              onFlourTypeChange={onFlourTypeChange}
              onFlourPercentChange={onFlourPercentChange}
              onFlourGramsChange={onFlourGramsChange}
              onFlourGramsStep={onFlourGramsStep}
              onRemoveFlour={onRemoveFlour}
            />
          ))}
        </ul>

        {blendMessage.message ? (
          <p className={`field-message field-message--${blendMessage.status}`}>{blendMessage.message}</p>
        ) : null}

        <button type="button" className="wizard-button wizard-button--secondary flour-add-button" onClick={onAddFlour}>
          <span className="button-icon" aria-hidden="true">
            +
          </span>
          Add flour
        </button>
      </form>
    </section>
  );
}

type FlourBlendRowProps = {
  entry: FlourBlendEntry;
  totalFlourGrams: number;
  isMultiFlour: boolean;
  onFlourTypeChange: (entryId: string, flourType: FlourType) => void;
  onFlourPercentChange: (entryId: string, percent: number) => void;
  onFlourGramsChange: (entryId: string, grams: number, totalFlourGrams: number) => void;
  onFlourGramsStep: (entryId: string, delta: number, totalFlourGrams: number) => void;
  onRemoveFlour: (entryId: string) => void;
};

function FlourBlendRow({
  entry,
  totalFlourGrams,
  isMultiFlour,
  onFlourTypeChange,
  onFlourPercentChange,
  onFlourGramsChange,
  onFlourGramsStep,
  onRemoveFlour,
}: FlourBlendRowProps) {
  const grams = getFlourGrams(entry.percent, totalFlourGrams);

  function handleGramsChange(rawValue: number): void {
    if (!Number.isFinite(rawValue)) {
      return;
    }

    onFlourGramsChange(entry.id, Math.round(rawValue), totalFlourGrams);
  }

  return (
    <li className="flour-blend-row">
      <label className="flour-blend-row__select">
        <span className="visually-hidden">Flour type</span>
        <select
          value={entry.flourType}
          onChange={(event) => onFlourTypeChange(entry.id, event.currentTarget.value as FlourType)}
        >
          {flourOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {isMultiFlour ? (
        <div className="flour-blend-row__allocation">
          <label className="flour-alloc-field">
            <span className="visually-hidden">Share of total flour</span>
            <input
              type="number"
              className="flour-alloc-input number-input--no-spinner"
              value={entry.percent}
              min={1}
              max={99}
              step={1}
              onChange={(event) => {
                const nextValue = event.currentTarget.valueAsNumber;
                if (Number.isFinite(nextValue)) {
                  onFlourPercentChange(entry.id, nextValue);
                }
              }}
            />
            <span className="flour-alloc-suffix">%</span>
          </label>
          <div className="flour-gram-stepper">
            <button
              type="button"
              className="icon-button icon-button--step"
              aria-label="Decrease flour grams"
              onClick={() => onFlourGramsStep(entry.id, -1, totalFlourGrams)}
            >
              −
            </button>
            <button
              type="button"
              className="icon-button icon-button--step"
              aria-label="Increase flour grams"
              onClick={() => onFlourGramsStep(entry.id, 1, totalFlourGrams)}
            >
              +
            </button>
            <label className="flour-alloc-field">
              <span className="visually-hidden">Flour weight</span>
              <input
                type="number"
                className="flour-alloc-input number-input--no-spinner"
                value={grams}
                min={1}
                max={totalFlourGrams}
                step={1}
                inputMode="numeric"
                onChange={(event) => handleGramsChange(event.currentTarget.valueAsNumber)}
              />
              <span className="flour-alloc-suffix">g</span>
            </label>
          </div>
          <button
            type="button"
            className="icon-button icon-button--delete"
            aria-label="Remove flour"
            onClick={() => onRemoveFlour(entry.id)}
          >
            <BinIcon />
          </button>
        </div>
      ) : (
        <p className="flour-blend-row__single-allocation" aria-label="Uses all flour in the dough">
          100% · {formatGrams(grams)}
        </p>
      )}
    </li>
  );
}
