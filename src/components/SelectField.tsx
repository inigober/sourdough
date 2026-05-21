import { FieldLabel } from './FieldLabel.tsx';

type SelectFieldProps<TValue extends string> = {
  label: string;
  value: TValue;
  options: readonly {
    label: string;
    value: TValue;
  }[];
  onChange: (value: TValue) => void;
  className?: string;
  info?: string;
  message?: string;
  status?: 'error' | 'warning';
};

export function SelectField<TValue extends string>({
  label,
  value,
  options,
  onChange,
  className,
  info,
  message,
  status,
}: SelectFieldProps<TValue>) {
  const classNames = ['field-card', className, status ? `field-card--${status}` : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={classNames}>
      <FieldLabel label={label} info={info} />
      <select value={value} onChange={(event) => onChange(event.currentTarget.value as TValue)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {message ? <span className={`field-message field-message--${status}`}>{message}</span> : null}
    </label>
  );
}
