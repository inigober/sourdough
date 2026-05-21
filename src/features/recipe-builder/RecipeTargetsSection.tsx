import { NumberField } from '../../components/NumberField.tsx';
import { SectionHeading } from '../../components/SectionHeading.tsx';
import type { RecipeInput, RecipeValidationIssue } from '../../lib/recipe/types.ts';
import { fieldInfo } from './fieldInfo.ts';
import { getFieldValidationProps } from './validationView.ts';

type RecipeTargetsSectionProps = {
  recipeInput: RecipeInput;
  validationIssues: RecipeValidationIssue[];
  onNumberChange: (field: RecipeTargetsNumberField, value: number) => void;
};

export type RecipeTargetsNumberField = 'hydrationPercent' | 'saltPercent';

export function RecipeTargetsSection({
  recipeInput,
  validationIssues,
  onNumberChange,
}: RecipeTargetsSectionProps) {
  return (
    <section className="card">
      <SectionHeading
        title={`${recipeInput.hydrationPercent}% hydration, ${recipeInput.saltPercent}% salt`}
        copy="Hydration and salt are baker&apos;s percentages based on total flour weight."
      />

      <form className="field-grid field-grid--pair">
        <NumberField
          label="Hydration"
          suffix="%"
          value={recipeInput.hydrationPercent}
          min={50}
          max={110}
          step={1}
          info={fieldInfo.hydrationPercent}
          onChange={(value) => onNumberChange('hydrationPercent', value)}
          {...getFieldValidationProps(validationIssues, 'hydrationPercent')}
        />
        <NumberField
          label="Salt"
          suffix="%"
          value={recipeInput.saltPercent}
          min={0}
          max={4}
          step={0.1}
          info={fieldInfo.saltPercent}
          onChange={(value) => onNumberChange('saltPercent', value)}
          {...getFieldValidationProps(validationIssues, 'saltPercent')}
        />
      </form>
    </section>
  );
}
