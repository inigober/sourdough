import { NumberField } from '../../components/NumberField.tsx';
import { SectionHeading } from '../../components/SectionHeading.tsx';
import type { RecipeInput, RecipeValidationIssue } from '../../lib/recipe/types.ts';
import { fieldInfo } from './fieldInfo.ts';
import { getFieldValidationProps } from './validationView.ts';

type DoughSizeSectionProps = {
  recipeInput: RecipeInput;
  validationIssues: RecipeValidationIssue[];
  onNumberChange: (field: DoughSizeNumberField, value: number) => void;
};

export type DoughSizeNumberField = 'finalDoughWeightGrams' | 'numberOfLoaves';

export function DoughSizeSection({
  recipeInput,
  validationIssues,
  onNumberChange,
}: DoughSizeSectionProps) {
  return (
    <section className="card">
      <SectionHeading
        title="How much dough are you making?"
        copy="Set the total dough weight and how many loaves you plan to bake. Flour blend is next, then hydration and salt."
      />

      <form className="field-grid field-grid--pair">
        <NumberField
          label="Final dough weight"
          suffix="g"
          value={recipeInput.finalDoughWeightGrams}
          min={1}
          step={50}
          info={fieldInfo.finalDoughWeightGrams}
          onChange={(value) => onNumberChange('finalDoughWeightGrams', value)}
          {...getFieldValidationProps(validationIssues, 'finalDoughWeightGrams')}
        />
        <NumberField
          label="Number of loaves"
          value={recipeInput.numberOfLoaves}
          min={1}
          step={1}
          info={fieldInfo.numberOfLoaves}
          onChange={(value) => onNumberChange('numberOfLoaves', value)}
          {...getFieldValidationProps(validationIssues, 'numberOfLoaves')}
        />
      </form>
    </section>
  );
}
