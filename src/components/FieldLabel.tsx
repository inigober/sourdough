import type { ReactNode } from 'react';

import { InfoToggle } from './InfoToggle.tsx';

type FieldLabelProps = {
  label: string;
  info?: string;
  htmlFor?: string;
  children?: ReactNode;
};

export function FieldLabel({ label, info, htmlFor, children }: FieldLabelProps) {
  const labelContent = htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>;

  return (
    <span className="field-label-row">
      {labelContent}
      {info ? <InfoToggle label={label}>{info}</InfoToggle> : null}
      {children}
    </span>
  );
}
