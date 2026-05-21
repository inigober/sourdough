import { useState } from 'react';

import { NumberField } from '../../components/NumberField.tsx';
import {
  applyStepScheduleEdit,
  getStepScheduleEdit,
  type StepScheduleEdit,
} from '../../lib/companion/stepScheduleEdits.ts';
import type { ScheduleInput } from '../../lib/schedule/types.ts';
import type { TimelineStep } from '../../lib/schedule/types.ts';

type CompanionStepEditDialogProps = {
  step: TimelineStep;
  scheduleInput: ScheduleInput;
  onCancel: () => void;
  onSave: (scheduleInput: ScheduleInput) => void;
};

export function CompanionStepEditDialog({
  step,
  scheduleInput,
  onCancel,
  onSave,
}: CompanionStepEditDialogProps) {
  const edit = getStepScheduleEdit(step.id);
  const [value, setValue] = useState(() =>
    edit ? Number(scheduleInput[edit.scheduleField]) : 0,
  );

  if (!edit) {
    return null;
  }

  function handleSave(): void {
    onSave(applyStepScheduleEdit(scheduleInput, edit as StepScheduleEdit, value));
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="companion-edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="companion-edit-title">Adjust this step</h2>
        <p className="dialog-card__message">
          Changes apply to this bake only. Your saved recipe stays unchanged.
        </p>
        <NumberField
          label={edit.label}
          suffix={edit.suffix}
          value={value}
          min={edit.min}
          max={edit.max}
          step={edit.step}
          showSteppers
          onChange={setValue}
        />
        <div className="dialog-card__actions">
          <button type="button" className="wizard-button wizard-button--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="wizard-button wizard-button--primary" onClick={handleSave}>
            Update step
          </button>
        </div>
      </div>
    </div>
  );
}
