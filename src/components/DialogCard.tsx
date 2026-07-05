import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';

import { CloseIcon } from './icons.tsx';
import { runDialogButtonAction } from './dialogAction.ts';

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const handleCancel = (event: Event): void => {
      event.preventDefault();
      onCloseRef.current();
    };

    dialog.addEventListener('cancel', handleCancel);

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  function handleDialogClick(event: MouseEvent<HTMLDialogElement>): void {
    if (event.target === event.currentTarget) {
      onCloseRef.current();
    }
  }

  function handleCloseClick(event: MouseEvent<HTMLButtonElement>): void {
    runDialogButtonAction(event, () => onCloseRef.current());
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog-backdrop"
      onClick={handleDialogClick}
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
        <div onMouseDown={stopEventPropagation} onClick={stopEventPropagation}>
          {actions}
        </div>
      </div>
    </dialog>
  );
}
