import { useEffect, useId, useState, type ChangeEvent, type FocusEvent } from 'react';

import { FieldLabel } from './FieldLabel.tsx';
import { MinusIcon, PlusIcon } from './icons.tsx';
import {
  commitNumberDraft,
  getValueWhileTyping,
  shouldHoldFieldMessage,
  stepWithinBounds,
} from '../lib/ui/numberFieldInput.ts';
import { formatNumberDraft, getStepDecimalPlaces } from '../lib/ui/numberFieldStep.ts';

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
  /**
   * Never rewrite what the user typed. Out-of-range numbers are reported as typed and a cleared
   * field is reported as NaN, so the caller's validation can show `message` and block Continue.
   * Leave off for fields with no validation of their own: they keep the old clamp-on-type behaviour.
   */
  keepOutOfRange?: boolean;
};

function formatDraft(value: number, stepSize: number): string {
  // NaN means "the user cleared this field": show it empty rather than as 0.
  return Number.isFinite(value) ? formatNumberDraft(value, stepSize) : '';
}

function normalizeDraft(raw: string, stepSize: number): string {
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

  const decimals = getStepDecimalPlaces(stepSize);
  if (decimals === 0) {
    return String(Math.round(parsed));
  }

  return parsed.toFixed(decimals);
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
  keepOutOfRange = false,
}: NumberFieldProps) {
  const stepSize = step ?? 1;
  const bounds = { step: stepSize, min, max };

  function adjustValue(delta: number): void {
    const nextValue = stepWithinBounds(value, delta, bounds);
    setDraft(formatDraft(nextValue, stepSize));
    onChange(nextValue);
  }

  const inputId = useId();
  const messageId = useId();
  const decrementDisabled = min !== undefined && value <= min;
  const incrementDisabled = max !== undefined && value >= max;
  const [draft, setDraft] = useState(() => formatDraft(value, stepSize));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    // A cleared field has value NaN. Keep its empty text instead of resyncing it to "0".
    if (!isFocused && Number.isFinite(value)) {
      setDraft(formatDraft(value, stepSize));
    }
  }, [isFocused, stepSize, value]);

  function commitDraft(nextDraft: string): void {
    const committed = commitNumberDraft(nextDraft, bounds, keepOutOfRange);
    setDraft(committed.draft);
    onChange(committed.value);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const raw = event.currentTarget.value;

    if (raw === '') {
      setDraft('');
      const cleared = getValueWhileTyping('', bounds, keepOutOfRange);
      if (cleared !== null) {
        onChange(cleared);
      }
      return;
    }

    if (!/^-?\d*\.?\d*$/.test(raw)) {
      return;
    }

    const normalized = normalizeDraft(raw, stepSize);
    setDraft(normalized);

    const typedValue = getValueWhileTyping(normalized, bounds, keepOutOfRange);
    if (typedValue !== null) {
      onChange(typedValue);
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

  const showMessage = Boolean(message) && !shouldHoldFieldMessage({ isFocused, draft, max });
  const visibleStatus = showMessage ? status : undefined;

  return (
    <div className={visibleStatus ? `field-card field-card--${visibleStatus}` : 'field-card'}>
      <FieldLabel label={label} info={info} htmlFor={inputId} />
      <span className={showSteppers ? 'input-row input-row--stepper' : 'input-row'}>
        <span className={showSteppers ? 'number-field__control' : undefined}>
          {showSteppers ? (
            <button
              type="button"
              className="number-field__stepper number-field__stepper--decrease"
              aria-label={`Decrease ${label}`}
              disabled={decrementDisabled}
              onClick={() => adjustValue(-stepSize)}
            >
              <MinusIcon />
            </button>
          ) : null}
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            className={hideSpinner || showSteppers ? 'number-input--no-spinner' : undefined}
            value={draft}
            step={step}
            aria-invalid={showMessage && status === 'error' ? true : undefined}
            aria-describedby={showMessage ? messageId : undefined}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {showSteppers ? (
            <button
              type="button"
              className="number-field__stepper number-field__stepper--increase"
              aria-label={`Increase ${label}`}
              disabled={incrementDisabled}
              onClick={() => adjustValue(stepSize)}
            >
              <PlusIcon />
            </button>
          ) : null}
        </span>
        {suffix ? <span className="input-suffix">{suffix}</span> : null}
      </span>
      {showMessage ? (
        // Appears when the baker leaves the field, so it is announced rather than waiting to be found.
        <span
          id={messageId}
          className={`field-message field-message--${status}`}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}
