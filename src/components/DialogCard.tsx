import type { ReactNode } from 'react';

import { CloseIcon } from './icons.tsx';

type DialogCardProps = {
  title: string;
  titleId: string;
  messageId?: string;
  variant?: 'default' | 'success';
  role?: 'dialog' | 'alertdialog';
  children?: ReactNode;
  actions: ReactNode;
  onClose: () => void;
};

export function DialogCard({
  title,
  titleId,
  messageId,
  variant = 'default',
  role = 'dialog',
  children,
  actions,
  onClose,
}: DialogCardProps) {
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className={
          variant === 'success'
            ? 'dialog-card dialog-card--success'
            : 'dialog-card'
        }
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog-card__header">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="wizard-icon-button dialog-card__close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>
        {children}
        {actions}
      </div>
    </div>
  );
}
