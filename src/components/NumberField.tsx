import { FieldLabel } from './FieldLabel.tsx';

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
  message?: string;
  status?: 'error' | 'warning';
};

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
  message,
  status,
}: NumberFieldProps) {
  return (
    <label className={status ? `field-card field-card--${status}` : 'field-card'}>
      <FieldLabel label={label} info={info} />
      <span className="input-row">
        <input
          type="number"
          className={hideSpinner ? 'number-input--no-spinner' : undefined}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const nextValue = event.currentTarget.valueAsNumber;
            if (Number.isFinite(nextValue)) {
              onChange(nextValue);
            }
          }}
        />
        {suffix ? <span className="input-suffix">{suffix}</span> : null}
      </span>
      {message ? <span className={`field-message field-message--${status}`}>{message}</span> : null}
    </label>
  );
}
