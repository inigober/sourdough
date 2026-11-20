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
  /**
   * 1 for the title of a screen that has no other level-1 heading (the wizard steps); 2 otherwise.
   * Level 1 keeps the h2 element so the existing styles apply, and says level 1 through aria-level.
   * The CSS split is done; switching this to a real h1 is a separate change (see docs/product/accessibility.md).
   */
  headingLevel?: 1 | 2;
  children?: ReactNode;
};

export function SectionHeading({
  eyebrow,
  title,
  copy,
  info,
  toggle,
  headingLevel = 2,
  children,
}: SectionHeadingProps) {
  return (
    <div className="section-heading">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <div className="section-heading__title-row">
        <h2 aria-level={headingLevel === 1 ? 1 : undefined}>{title}</h2>
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
