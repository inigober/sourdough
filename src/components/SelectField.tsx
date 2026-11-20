import { useId } from 'react';

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
  const selectId = useId();
  const messageId = useId();
  const classNames = ['field-card', className, status ? `field-card--${status}` : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      <FieldLabel label={label} info={info} htmlFor={selectId} />
      <select
        id={selectId}
        value={value}
        aria-invalid={message && status === 'error' ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        onChange={(event) => onChange(event.currentTarget.value as TValue)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {message ? (
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
