import { SectionHeading } from '../../components/SectionHeading.tsx';
import {
  SCHEDULE_PRESET_INFO,
  type SchedulePresetId,
  type SchedulePresetInfo,
} from '../../lib/schedule/presets.ts';

type SchedulePresetPickerProps = {
  /** The preset the current values match, or null when the plan is Custom. */
  selectedPresetId: SchedulePresetId | null;
  onSelect: (presetId: SchedulePresetId) => void;
  presets?: readonly SchedulePresetInfo[];
};

export function SchedulePresetPicker({
  selectedPresetId,
  onSelect,
  presets = SCHEDULE_PRESET_INFO,
}: SchedulePresetPickerProps) {
  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);

  return (
    <section className="card schedule-presets">
      <SectionHeading
        title="Choose a plan"
        copy="Pick the kind of bake day you want and the timeline below fills itself in. You can fine-tune every step under Customise."
      />
      <fieldset className="schedule-presets__group">
        <legend className="visually-hidden">Bake plan</legend>
        {presets.map((preset) => (
          <label
            key={preset.id}
            className={
              preset.id === selectedPresetId
                ? 'schedule-presets__option schedule-presets__option--selected'
                : 'schedule-presets__option'
            }
          >
            <input
              type="radio"
              name="schedule-preset"
              className="schedule-presets__input"
              checked={preset.id === selectedPresetId}
              onChange={() => onSelect(preset.id)}
            />
            <span className="schedule-presets__label">{preset.label}</span>
            <span className="schedule-presets__description">{preset.description}</span>
          </label>
        ))}
      </fieldset>
      <p className="schedule-presets__status" role="status">
        {selectedPreset
          ? `Current plan: ${selectedPreset.label}.`
          : 'Current plan: Custom. Your own settings are kept until you pick one of the plans above.'}
      </p>
    </section>
  );
}
