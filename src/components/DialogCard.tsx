import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';

import { CloseIcon } from './icons.tsx';
import { runDialogButtonAction } from './dialogAction.ts';

const BACKDROP_DISMISS_GRACE_MS = 300;

function stopEventPropagation(event: MouseEvent<HTMLElement>): void {
  event.stopPropagation();
}

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
  const openedAtRef = useRef(performance.now());
  const pointerStartedInsideRef = useRef(false);

  useEffect(() => {
    openedAtRef.current = performance.now();
    pointerStartedInsideRef.current = false;
  }, []);

  function handleDialogPointerDown(): void {
    pointerStartedInsideRef.current = true;
  }

  function handleBackdropPointerDown(event: MouseEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) {
      pointerStartedInsideRef.current = false;
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>): void {
    if (event.target !== event.currentTarget) {
      return;
    }

    // Ignore the click that completes a press that started on a dialog control.
    if (pointerStartedInsideRef.current) {
      pointerStartedInsideRef.current = false;
      return;
    }

    // A button click that swaps or closes this dialog can finish bubbling after unmount
    // and land on a newly mounted backdrop — ignore that stray click.
    if (performance.now() - openedAtRef.current < BACKDROP_DISMISS_GRACE_MS) {
      return;
    }

    onClose();
  }

  function handleCloseClick(event: MouseEvent<HTMLButtonElement>): void {
    runDialogButtonAction(event, onClose);
  }

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onPointerDown={handleBackdropPointerDown}
      onClick={handleBackdropClick}
    >
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
        onPointerDown={handleDialogPointerDown}
        onMouseDown={stopEventPropagation}
        onClick={stopEventPropagation}
      >
        <header className="dialog-card__header">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="wizard-icon-button dialog-card__close"
            aria-label="Close dialog"
            onClick={handleCloseClick}
          >
            <CloseIcon />
          </button>
        </header>
        {children}
        <div
          onPointerDown={stopEventPropagation}
          onMouseDown={stopEventPropagation}
          onClick={stopEventPropagation}
        >
          {actions}
        </div>
      </div>
    </div>
  );
}
