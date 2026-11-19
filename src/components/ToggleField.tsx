import { useId } from 'react';

import { FieldLabel } from './FieldLabel.tsx';

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  info?: string;
};

export function ToggleField({ label, checked, onChange, description, info }: ToggleFieldProps) {
  const inputId = useId();

  return (
    <div className="field-card field-card--toggle">
      <div>
        <FieldLabel label={label} info={info} htmlFor={inputId} />
        {description ? (
          <label htmlFor={inputId} className="field-description">
            {description}
          </label>
        ) : null}
      </div>
      <label className="field-card__checkbox-hit">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
      </label>
    </div>
  );
}
