import { LOAF_ASSESSMENT_OPTIONS } from '../lib/history/assessment.ts';
import type { BakeSessionAssessment } from '../lib/history/types.ts';

type LoafAssessmentPickerProps = {
  value?: BakeSessionAssessment;
  onChange: (value: BakeSessionAssessment | undefined) => void;
  allowUnset?: boolean;
};

export function LoafAssessmentPicker({
  value,
  onChange,
  allowUnset = true,
}: LoafAssessmentPickerProps) {
  return (
    <div className="loaf-assessment-picker" role="group" aria-label="Loaf assessment">
      {LOAF_ASSESSMENT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={
            value === option.value
              ? 'loaf-assessment-picker__chip loaf-assessment-picker__chip--active'
              : 'loaf-assessment-picker__chip'
          }
          aria-pressed={value === option.value}
          onClick={() => onChange(value === option.value && allowUnset ? undefined : option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
