import type { ReactNode } from 'react';

import { InfoToggle } from './InfoToggle.tsx';

type FieldLabelProps = {
  label: string;
  info?: string;
  children?: ReactNode;
};

export function FieldLabel({ label, info, children }: FieldLabelProps) {
  return (
    <span className="field-label-row">
      <span>{label}</span>
      {info ? <InfoToggle label={label}>{info}</InfoToggle> : null}
      {children}
    </span>
  );
}
