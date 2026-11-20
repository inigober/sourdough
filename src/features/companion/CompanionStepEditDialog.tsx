import { useState } from 'react';

import { DialogCard } from '../../components/DialogCard.tsx';
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
    <DialogCard
      title="Adjust this step"
      titleId="companion-edit-title"
      messageId="companion-edit-message"
      onClose={onCancel}
      actions={
        <div className="dialog-card__actions">
          <button type="button" className="wizard-button wizard-button--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="wizard-button wizard-button--primary" onClick={handleSave}>
            Update step
          </button>
        </div>
      }
    >
      <p id="companion-edit-message" className="dialog-card__message">
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
    </DialogCard>
  );
}
