import {
  useLayoutEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    // showModal before paint; portal to body — see docs/engineering/leave-dialog-and-unsaved-navigation.md
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const handleCancel = (event: Event): void => {
      event.preventDefault();
      onCloseRef.current();
    };

    const handleBackdropClick = (event: Event): void => {
      if (event.target === dialog) {
        onCloseRef.current();
      }
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('click', handleBackdropClick);

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('click', handleBackdropClick);
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  function handleCardClick(event: MouseEvent<HTMLDivElement>): void {
    event.stopPropagation();
  }

  return createPortal(
    <dialog ref={dialogRef} className="dialog-backdrop">
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
        onClick={handleCardClick}
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
        <div onClick={handleCardClick}>{actions}</div>
      </div>
    </dialog>,
    document.body,
  );
}
