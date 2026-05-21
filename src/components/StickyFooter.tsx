import type { ReactNode } from 'react';

type StickyFooterProps = {
  secondaryAction?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function StickyFooter({ secondaryAction, children, className }: StickyFooterProps) {
  return (
    <div className={className ? `page-shell__footer-wrap ${className}` : 'page-shell__footer-wrap'}>
      {secondaryAction}
      <div className="page-shell__footer">{children}</div>
    </div>
  );
}
