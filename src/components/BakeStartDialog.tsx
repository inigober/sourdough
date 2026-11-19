import { useEffect, useId, useMemo, useState } from 'react';

import type { RecipeInput } from '../lib/recipe/types.ts';
import {
  getBakeStartPastWarning,
  getDefaultBakeStart,
  getStartNowChoice,
  isBakeStartChoiceValid,
  previewBakeStart,
  type BakeStartChoice,
} from '../lib/schedule/bakeStart.ts';
import type { ScheduleInput } from '../lib/schedule/types.ts';
import { DialogCard } from './DialogCard.tsx';
import { RecipeCard } from './RecipeCard.tsx';

type BakeStartDialogProps = {
  recipeInput: RecipeInput;
  scheduleInput: ScheduleInput;
  isStarting: boolean;
  onCancel: () => void;
  onConfirm: (choice: BakeStartChoice) => void;
};

/** Recipes only know relative days; this is where a bake gets its real mix date and time. */
export function BakeStartDialog({
  recipeInput,
  scheduleInput,
  isStarting,
  onCancel,
  onConfirm,
}: BakeStartDialogProps) {
  const dateInputId = useId();
  const timeInputId = useId();
  const [choice, setChoice] = useState<BakeStartChoice>(() =>
    getDefaultBakeStart(scheduleInput.startTime),
  );
  const isValid = isBakeStartChoiceValid(choice);

  // Re-check every 30s so a time that was fine on open can become "in the past" while the dialog waits.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const pastWarning = getBakeStartPastWarning(choice, now);

  const previewRows = useMemo(() => {
    if (!isValid) {
      return [];
    }

    const preview = previewBakeStart(scheduleInput, recipeInput, choice);
    const rows: (readonly [string, string])[] = [];

    // When the first step is the mix itself, listing it twice adds nothing.
    if (preview.firstStep && preview.firstStep.when !== preview.mix) {
      rows.push([preview.firstStep.label, preview.firstStep.when]);
    }
    if (preview.mix) {
      rows.push(['Mix', preview.mix]);
    }
    if (preview.oven) {
      rows.push(['Oven on', preview.oven]);
    }

    return rows;
  }, [choice, isValid, recipeInput, scheduleInput]);

  return (
    <DialogCard
      title="When are you mixing?"
      titleId="bake-start-dialog-title"
      messageId="bake-start-dialog-copy"
      onClose={onCancel}
      actions={
        <div className="dialog-card__actions">
          <button type="button" className="wizard-button wizard-button--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="wizard-button wizard-button--primary"
            disabled={!isValid || isStarting}
            onClick={() => onConfirm(choice)}
          >
            {isStarting ? 'Starting…' : 'Start baking'}
          </button>
        </div>
      }
    >
      <p id="bake-start-dialog-copy" className="section-copy">
        Pick the day and time you will start mixing. Every step, including the oven, follows from it.
      </p>
      <div className="field-grid field-grid--pair bake-start__fields">
        <div className="field-card">
          <label htmlFor={dateInputId} className="field-label-row">
            Mix date
          </label>
          <input
            id={dateInputId}
            type="date"
            value={choice.mixDate}
            onChange={(event) => setChoice({ ...choice, mixDate: event.currentTarget.value })}
          />
        </div>
        <div className="field-card">
          <label htmlFor={timeInputId} className="field-label-row">
            Start time
          </label>
          <input
            id={timeInputId}
            type="time"
            value={choice.startTime}
            onChange={(event) => setChoice({ ...choice, startTime: event.currentTarget.value })}
          />
        </div>
      </div>
      <div className="bake-start__timing">
        {pastWarning ? (
          <p className="field-message field-message--warning" role="status">
            {pastWarning}
          </p>
        ) : null}
        <button
          type="button"
          className="wizard-button wizard-button--secondary bake-start__now"
          onClick={() => {
            const startNow = new Date();
            setNow(startNow);
            setChoice(getStartNowChoice(startNow));
          }}
        >
          Start now
        </button>
      </div>
      {previewRows.length > 0 ? (
        <div className="bake-start__preview" role="status" aria-live="polite">
          <RecipeCard title="Your bake" rows={previewRows} embedded />
        </div>
      ) : null}
    </DialogCard>
  );
}
