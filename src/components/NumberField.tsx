import { useEffect, useState, type ChangeEvent, type FocusEvent } from 'react';

import { FieldLabel } from './FieldLabel.tsx';
import { ChevronDownIcon, ChevronUpIcon } from './icons.tsx';

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  info?: string;
  hideSpinner?: boolean;
  showSteppers?: boolean;
  message?: string;
  status?: 'error' | 'warning';
};

function clampValue(value: number, min?: number, max?: number): number {
  let nextValue = value;

  if (min !== undefined) {
    nextValue = Math.max(min, nextValue);
  }

  if (max !== undefined) {
    nextValue = Math.min(max, nextValue);
  }

  return nextValue;
}

function formatDraft(value: number): string {
  return Number.isFinite(value) ? String(value) : '0';
}

function normalizeDraft(raw: string): string {
  if (raw === '' || raw === '-' || raw === '.') {
    return raw;
  }

  if (/^\d+\.$/.test(raw)) {
    return raw;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return raw;
  }

  return String(parsed);
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  min,
  max,
  step,
  info,
  hideSpinner = false,
  showSteppers = true,
  message,
  status,
}: NumberFieldProps) {
  const stepSize = step ?? 1;

  function adjustValue(delta: number): void {
    const nextValue = clampValue(value + delta, min, max);
    setDraft(formatDraft(nextValue));
    onChange(nextValue);
  }

  const decrementDisabled = min !== undefined && value <= min;
  const incrementDisabled = max !== undefined && value >= max;
  const [draft, setDraft] = useState(() => formatDraft(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(formatDraft(value));
    }
  }, [isFocused, value]);

  function commitDraft(nextDraft: string): void {
    if (nextDraft === '' || nextDraft === '-' || nextDraft === '.') {
      const fallback = min ?? 0;
      setDraft(formatDraft(fallback));
      onChange(fallback);
      return;
    }

    const parsed = Number(nextDraft);
    if (!Number.isFinite(parsed)) {
      setDraft(formatDraft(value));
      return;
    }

    const clamped = clampValue(parsed, min, max);
    setDraft(formatDraft(clamped));
    onChange(clamped);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const raw = event.currentTarget.value;

    if (raw === '') {
      setDraft('');
      return;
    }

    if (!/^-?\d*\.?\d*$/.test(raw)) {
      return;
    }

    const normalized = normalizeDraft(raw);
    setDraft(normalized);

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      onChange(clampValue(parsed, min, max));
    }
  }

  function handleFocus(event: FocusEvent<HTMLInputElement>): void {
    setIsFocused(true);
    event.currentTarget.select();
  }

  function handleBlur(): void {
    setIsFocused(false);
    commitDraft(draft);
  }

  return (
    <label className={status ? `field-card field-card--${status}` : 'field-card'}>
      <FieldLabel label={label} info={info} />
      <span className={showSteppers ? 'input-row input-row--stepper' : 'input-row'}>
        <span className={showSteppers ? 'number-field__control' : undefined}>
          <input
            type="text"
            inputMode="decimal"
            className={hideSpinner || showSteppers ? 'number-input--no-spinner' : undefined}
            value={draft}
            step={step}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {showSteppers ? (
            <span className="number-field__steppers" aria-hidden="true">
              <button
                type="button"
                className="number-field__stepper"
                aria-label={`Increase ${label}`}
                disabled={incrementDisabled}
                tabIndex={-1}
                onClick={() => adjustValue(stepSize)}
              >
                <ChevronUpIcon />
              </button>
              <button
                type="button"
                className="number-field__stepper"
                aria-label={`Decrease ${label}`}
                disabled={decrementDisabled}
                tabIndex={-1}
                onClick={() => adjustValue(-stepSize)}
              >
                <ChevronDownIcon />
              </button>
            </span>
          ) : null}
        </span>
        {suffix ? <span className="input-suffix">{suffix}</span> : null}
      </span>
      {message ? <span className={`field-message field-message--${status}`}>{message}</span> : null}
    </label>
  );
}
