import type { ReactNode } from 'react';

import { InfoToggle } from './InfoToggle.tsx';

type SectionToggleProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  copy?: string;
  info?: string;
  toggle?: SectionToggleProps;
  children?: ReactNode;
};

export function SectionHeading({
  eyebrow,
  title,
  copy,
  info,
  toggle,
  children,
}: SectionHeadingProps) {
  return (
    <div className="section-heading">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <div className="section-heading__title-row">
        <h2>{title}</h2>
        {info ? <InfoToggle label={title}>{info}</InfoToggle> : null}
        {toggle ? (
          <label className="section-heading__toggle">
            <span className="visually-hidden">{toggle.label}</span>
            <input
              type="checkbox"
              checked={toggle.checked}
              onChange={(event) => toggle.onChange(event.currentTarget.checked)}
            />
          </label>
        ) : null}
      </div>
      {copy ? <p className="section-copy">{copy}</p> : null}
      {children}
    </div>
  );
}
