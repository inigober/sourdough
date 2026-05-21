import { FieldLabel } from './FieldLabel.tsx';

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  info?: string;
};

export function ToggleField({ label, checked, onChange, description, info }: ToggleFieldProps) {
  return (
    <label className="field-card field-card--toggle">
      <span>
        <FieldLabel label={label} info={info} />
        {description ? <span className="field-description">{description}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    </label>
  );
}
