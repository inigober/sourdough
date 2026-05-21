import type { ReactNode } from 'react';

type PageShellProps = {
  topBar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PageShell({ topBar, footer, children, className }: PageShellProps) {
  return (
    <div className={className ? `page-shell ${className}` : 'page-shell'}>
      {topBar}
      <div className="page-shell__body">{children}</div>
      {footer}
    </div>
  );
}
