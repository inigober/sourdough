import type { ReactNode } from 'react';

import { InfoToggle } from './InfoToggle.tsx';

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  copy?: string;
  info?: string;
  children?: ReactNode;
};

export function SectionHeading({ eyebrow, title, copy, info, children }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <div className="section-heading__title-row">
        <h2>{title}</h2>
        {info ? <InfoToggle label={title}>{info}</InfoToggle> : null}
      </div>
      {copy ? <p className="section-copy">{copy}</p> : null}
      {children}
    </div>
  );
}
