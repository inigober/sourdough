import { useEffect, useState, type FocusEvent } from 'react';

import { InfoToggle } from '../../components/InfoToggle.tsx';
import { PenEditButton } from '../../components/PenEditButton.tsx';
import { SectionHeading } from '../../components/SectionHeading.tsx';
import { BinIcon, MinusIcon, PlusIcon } from '../../components/icons.tsx';
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
  onFlourPercentStep: (entryId: string, delta: number) => void;
  onAddFlour: () => void;
  onRemoveFlour: (entryId: string) => void;
  onEditDoughWeight: () => void;
};

export function FlourSection({
  recipeInput,
  validationIssues,
  onFlourTypeChange,
  onFlourPercentChange,
  onFlourPercentStep,
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
        headingLevel={1}
        title={isMultiFlour ? 'Which flours are you blending?' : 'Which flour are you using?'}
        copy={
          isMultiFlour
            ? 'These flours share 100% of the total flour in your dough. Use the steppers to adjust each share.'
            : 'Choose the flour in your dough. Hydration and salt come on the next step.'
        }
      />

      <div className="flour-context-strip">
        <div className="reference-chip reference-chip--static">
          <span className="reference-chip__label">
            <span>Total dough weight</span>
            <PenEditButton
              className="reference-chip__action"
              label="Edit dough weight"
              onClick={onEditDoughWeight}
            />
          </span>
          <strong>{recipeInput.finalDoughWeightGrams}g</strong>
        </div>
        <div className="reference-chip reference-chip--static">
          <span className="reference-chip__label">
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
              onFlourPercentStep={onFlourPercentStep}
              onRemoveFlour={onRemoveFlour}
            />
          ))}
        </ul>

        {blendMessage.message ? (
          <p
            className={`field-message field-message--${blendMessage.status}`}
            role={blendMessage.status === 'error' ? 'alert' : 'status'}
          >
            {blendMessage.message}
          </p>
        ) : null}

        <button type="button" className="button button--secondary flour-add-button" onClick={onAddFlour}>
          <PlusIcon />
          Add another flour
        </button>
      </form>

      <p className="flour-blend-summary">
        <span className="flour-blend-summary__label">Your blend</span>
        <strong>{formatFlourBlendSummary(recipeInput.doughFlours)}</strong>
      </p>
    </section>
  );
}

type FlourBlendRowProps = {
  entry: FlourBlendEntry;
  totalFlourGrams: number;
  isMultiFlour: boolean;
  onFlourTypeChange: (entryId: string, flourType: FlourType) => void;
  onFlourPercentChange: (entryId: string, percent: number) => void;
  onFlourPercentStep: (entryId: string, delta: number) => void;
  onRemoveFlour: (entryId: string) => void;
};

function FlourBlendRow({
  entry,
  totalFlourGrams,
  isMultiFlour,
  onFlourTypeChange,
  onFlourPercentChange,
  onFlourPercentStep,
  onRemoveFlour,
}: FlourBlendRowProps) {
  const grams = getFlourGrams(entry.percent, totalFlourGrams);
  // Rows repeat when blending, so every control names its flour: "Remove Whole wheat", not "Remove flour".
  const flourLabel = flourOptions.find((option) => option.value === entry.flourType)?.label ?? 'flour';

  return (
    <li className={isMultiFlour ? 'flour-blend-row flour-blend-row--multi' : 'flour-blend-row flour-blend-row--single'}>
      <label className="flour-blend-row__select">
        <span className="visually-hidden">{isMultiFlour ? `Flour type, currently ${flourLabel}` : 'Flour type'}</span>
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
        <div className="flour-blend-row__meta">
          <FlourPercentStepper
            flourLabel={flourLabel}
            value={entry.percent}
            grams={grams}
            onCommitPercent={(value) => onFlourPercentChange(entry.id, value)}
            onStepPercent={(delta) => onFlourPercentStep(entry.id, delta)}
          />
          <button
            type="button"
            className="icon-button icon-button--delete"
            aria-label={`Remove ${flourLabel}`}
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

type FlourPercentStepperProps = {
  flourLabel: string;
  value: number;
  grams: number;
  onCommitPercent: (value: number) => void;
  onStepPercent: (delta: number) => void;
};

function FlourPercentStepper({
  flourLabel,
  value,
  grams,
  onCommitPercent,
  onStepPercent,
}: FlourPercentStepperProps) {
  const [draft, setDraft] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);
  const decrementDisabled = value <= 1;
  const incrementDisabled = value >= 99;

  useEffect(() => {
    if (!isFocused) {
      setDraft(String(value));
    }
  }, [isFocused, value]);

  function commitDraft(raw: string): void {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }

    const clamped = Math.min(99, Math.max(1, Math.round(parsed)));
    setDraft(String(clamped));
    onCommitPercent(clamped);
  }

  function stepPercent(delta: number): void {
    const nextValue = Math.min(99, Math.max(1, value + delta));
    setDraft(String(nextValue));
    onStepPercent(delta);
  }

  function handleFocus(event: FocusEvent<HTMLInputElement>): void {
    setIsFocused(true);
    event.currentTarget.select();
  }

  return (
    <div className="flour-blend-row__allocation">
      <div className="flour-percent-stepper">
        <span className="visually-hidden">Share of total flour: {flourLabel}</span>
        <button
          type="button"
          className="icon-button icon-button--step flour-percent-stepper__button"
          aria-label={`Decrease ${flourLabel} percentage`}
          disabled={decrementDisabled}
          onClick={() => stepPercent(-1)}
        >
          <MinusIcon />
        </button>
        <label className="flour-percent-stepper__value">
          <span className="visually-hidden">{flourLabel} percentage</span>
          <input
            type="text"
            inputMode="numeric"
            className="number-input--no-spinner flour-percent-stepper__input"
            value={draft}
            onChange={(event) => {
              const raw = event.currentTarget.value;
              if (raw === '' || /^\d*$/.test(raw)) {
                setDraft(raw);
              }
            }}
            onFocus={handleFocus}
            onBlur={() => {
              setIsFocused(false);
              commitDraft(draft);
            }}
          />
          <span className="flour-percent-stepper__suffix">%</span>
        </label>
        <button
          type="button"
          className="icon-button icon-button--step flour-percent-stepper__button"
          aria-label={`Increase ${flourLabel} percentage`}
          disabled={incrementDisabled}
          onClick={() => stepPercent(1)}
        >
          <PlusIcon />
        </button>
      </div>
      <span className="flour-blend-row__grams">{formatGrams(grams)}</span>
    </div>
  );
}
