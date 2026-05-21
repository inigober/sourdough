import { NumberField } from '../../components/NumberField.tsx';
import { SectionHeading } from '../../components/SectionHeading.tsx';
import { SelectField } from '../../components/SelectField.tsx';
import type {
  FlourType,
  LevainActivity,
  LevainType,
  RecipeInput,
  RecipeValidationIssue,
} from '../../lib/recipe/types.ts';
import { fieldInfo } from './fieldInfo.ts';
import { flourOptions, levainActivityOptions, levainTypeOptions } from './recipeOptions.ts';
import { getFieldValidationProps } from './validationView.ts';

type FermentationSectionProps = {
  recipeInput: RecipeInput;
  validationIssues: RecipeValidationIssue[];
  onNumberChange: (field: FermentationNumberField, value: number) => void;
  onLevainActivityChange: (activity: LevainActivity) => void;
  onLevainTypeChange: (levainType: LevainType) => void;
  onLevainHydrationChange: (value: number) => void;
  onLevainFlourChange: (flourType: FlourType) => void;
};

export type FermentationNumberField =
  | 'targetBulkHours'
  | 'roomTemperatureCelsius'
  | 'levainHydrationPercent';

export function FermentationSection({
  recipeInput,
  validationIssues,
  onNumberChange,
  onLevainActivityChange,
  onLevainTypeChange,
  onLevainHydrationChange,
  onLevainFlourChange,
}: FermentationSectionProps) {
  const showCustomLevainHydration = recipeInput.levainType === 'customHydration';

  return (
    <section className="card">
      <SectionHeading
        title="Timing and starter strength"
        copy="Bulk time, room temperature, and levain details shape how much prefermented flour the recipe needs."
      />

      <form className="field-grid field-grid--responsive">
        <NumberField
          label="Target bulk fermentation time"
          suffix="h"
          value={recipeInput.targetBulkHours}
          min={2}
          max={12}
          step={0.5}
          info={fieldInfo.targetBulkHours}
          onChange={(value) => onNumberChange('targetBulkHours', value)}
          {...getFieldValidationProps(validationIssues, 'targetBulkHours')}
        />
        <NumberField
          label="Room temp"
          suffix="°C"
          value={recipeInput.roomTemperatureCelsius}
          min={16}
          max={32}
          step={1}
          info={fieldInfo.roomTemperatureCelsius}
          onChange={(value) => onNumberChange('roomTemperatureCelsius', value)}
          {...getFieldValidationProps(validationIssues, 'roomTemperatureCelsius')}
        />
        <SelectField
          label="Levain activity"
          value={recipeInput.levainActivity}
          options={levainActivityOptions}
          info={fieldInfo.levainActivity}
          onChange={onLevainActivityChange}
          {...getFieldValidationProps(validationIssues, 'levainActivity')}
        />
        <SelectField
          label="Levain type"
          value={recipeInput.levainType}
          options={levainTypeOptions}
          info={fieldInfo.levainType}
          onChange={onLevainTypeChange}
        />
        {showCustomLevainHydration ? (
          <NumberField
            label="Custom levain hydration"
            suffix="%"
            value={recipeInput.levainHydrationPercent}
            min={40}
            max={200}
            step={1}
            info={fieldInfo.levainHydrationPercent}
            onChange={onLevainHydrationChange}
            {...getFieldValidationProps(validationIssues, 'levainHydrationPercent')}
          />
        ) : null}
        <SelectField
          label="Levain flour"
          value={recipeInput.levainFlourType}
          options={flourOptions}
          info={fieldInfo.levainFlourType}
          onChange={onLevainFlourChange}
        />
      </form>
    </section>
  );
}
