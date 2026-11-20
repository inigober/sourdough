import { useEffect, useId, useState, type KeyboardEvent } from 'react';

import { MinusIcon, PlusIcon } from '../../components/icons.tsx';
import {
  formatMinutesReadable,
  type StepChange,
  type StepEditResult,
} from '../../lib/schedule/stepEditPanel.ts';
import type { TimelineStep } from '../../lib/schedule/types.ts';

type StepEditPanelProps = {
  step: TimelineStep;
  /** Applies the change to the schedule. The panel shows what moved, or why it was refused. */
  onApply: (change: StepChange) => StepEditResult;
};

const DURATION_STEP_MINUTES = 5;

/** Flat panel under an open timeline row: start time, duration, and what the change moved. */
export function StepEditPanel({ step, onApply }: StepEditPanelProps) {
  const startId = useId();
  const durationId = useId();
  const [durationDraft, setDurationDraft] = useState(String(step.durationMinutes));
  const [isDurationFocused, setIsDurationFocused] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'summary'; text: string } | null>(null);

  useEffect(() => {
    if (!isDurationFocused) {
      setDurationDraft(String(step.durationMinutes));
    }
  }, [isDurationFocused, step.durationMinutes]);

  function apply(change: StepChange): void {
    const result = onApply(change);
    if (result.ok) {
      setFeedback({ kind: 'summary', text: result.summary });
      return;
    }

    // Keep the old value on screen and say why.
    setFeedback({ kind: 'error', text: result.reason });
    setDurationDraft(String(step.durationMinutes));
  }

  function commitDuration(): void {
    const minutes = Number(durationDraft);
    if (durationDraft.trim() !== '' && minutes === step.durationMinutes) {
      return;
    }
    apply({ durationMinutes: durationDraft.trim() === '' ? Number.NaN : minutes });
  }

  function handleDurationKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitDuration();
    }
  }

  return (
    <div className="step-edit">
      <div className="step-edit__field">
        <label htmlFor={startId} className="step-edit__label">
          Start time
        </label>
        <input
          id={startId}
          type="time"
          value={step.startTime}
          onChange={(event) => {
            if (event.currentTarget.value) {
              apply({ startTime: event.currentTarget.value });
            }
          }}
        />
      </div>

      <div className="step-edit__field">
        <label htmlFor={durationId} className="step-edit__label">
          Duration
        </label>
        <span className="input-row input-row--stepper">
          <span className="number-field__control">
            <button
              type="button"
              className="number-field__stepper number-field__stepper--decrease"
              aria-label="Decrease duration"
              disabled={step.durationMinutes <= DURATION_STEP_MINUTES}
              onClick={() => apply({ durationMinutes: step.durationMinutes - DURATION_STEP_MINUTES })}
            >
              <MinusIcon />
            </button>
            <input
              id={durationId}
              type="text"
              inputMode="numeric"
              className="number-input--no-spinner"
              value={durationDraft}
              onChange={(event) => setDurationDraft(event.currentTarget.value.replace(/[^\d]/g, ''))}
              onFocus={(event) => {
                setIsDurationFocused(true);
                event.currentTarget.select();
              }}
              onBlur={() => {
                setIsDurationFocused(false);
                commitDuration();
              }}
              onKeyDown={handleDurationKeyDown}
            />
            <button
              type="button"
              className="number-field__stepper number-field__stepper--increase"
              aria-label="Increase duration"
              onClick={() => apply({ durationMinutes: step.durationMinutes + DURATION_STEP_MINUTES })}
            >
              <PlusIcon />
            </button>
          </span>
          <span className="input-suffix">min</span>
        </span>
        <span className="step-edit__readable">{formatMinutesReadable(step.durationMinutes)}</span>
      </div>

      {feedback ? (
        <p
          className={
            feedback.kind === 'error'
              ? 'step-edit__feedback step-edit__feedback--error'
              : 'step-edit__feedback'
          }
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}
