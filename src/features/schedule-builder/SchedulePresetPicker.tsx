import { SectionHeading } from '../../components/SectionHeading.tsx';
import {
  CUSTOM_PLAN_OPTION,
  SCHEDULE_PRESET_INFO,
  type SchedulePlanOptionId,
  type SchedulePresetInfo,
} from '../../lib/schedule/presets.ts';

type SchedulePresetPickerProps = {
  /** The selected plan option: one of the presets, or 'custom' (own values, field groups shown). */
  selectedOptionId: SchedulePlanOptionId;
  onSelect: (optionId: SchedulePlanOptionId) => void;
  presets?: readonly SchedulePresetInfo[];
  /** The id of the region the Custom option reveals, so assistive tech can link them. */
  customPanelId?: string;
};

export function SchedulePresetPicker({
  selectedOptionId,
  onSelect,
  presets = SCHEDULE_PRESET_INFO,
  customPanelId,
}: SchedulePresetPickerProps) {
  const options = [...presets, CUSTOM_PLAN_OPTION];
  const selectedOption = options.find((option) => option.id === selectedOptionId) ?? CUSTOM_PLAN_OPTION;

  return (
    <section className="card schedule-presets">
      <SectionHeading
        title="Choose a plan"
        copy="Pick the kind of bake day you want and the timeline fills itself in. Choose Custom to fine-tune every step."
      />
      <fieldset className="schedule-presets__group">
        <legend className="visually-hidden">Bake plan</legend>
        {options.map((option) => (
          <label
            key={option.id}
            className={
              option.id === selectedOptionId
                ? 'schedule-presets__option schedule-presets__option--selected'
                : 'schedule-presets__option'
            }
          >
            <input
              type="radio"
              name="schedule-preset"
              className="schedule-presets__input"
              checked={option.id === selectedOptionId}
              aria-controls={option.id === 'custom' ? customPanelId : undefined}
              onChange={() => onSelect(option.id)}
            />
            <span className="schedule-presets__label">{option.label}</span>
            <span className="schedule-presets__description">{option.description}</span>
          </label>
        ))}
      </fieldset>
      <p className="schedule-presets__status" role="status">
        {selectedOption.id === 'custom'
          ? 'Current plan: Custom. Your own settings are kept until you pick one of the other plans.'
          : `Current plan: ${selectedOption.label}.`}
      </p>
    </section>
  );
}
