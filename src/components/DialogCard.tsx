import {
  useLayoutEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { useSheetDrag } from '../lib/ui/useSheetDrag.ts';
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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useSheetDrag(cardRef, headerRef, onClose);

  useLayoutEffect(() => {
    // showModal before paint; portal to body — see docs/engineering/leave-dialog-and-unsaved-navigation.md
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    // Remember what had focus, so closing the dialog puts the baker back where they were.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

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

    // showModal() would focus the first control (the Close button). Start on the title instead, so
    // VoiceOver reads what the dialog is before it offers any button.
    titleRef.current?.focus({ preventScroll: true });

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('click', handleBackdropClick);
      if (dialog.open) {
        dialog.close();
      }
      if (opener && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, []);

  function handleCardClick(event: MouseEvent<HTMLDivElement>): void {
    event.stopPropagation();
  }

  return createPortal(
    // The role and name live on the <dialog> itself: one dialog for assistive tech, not two nested.
    <dialog
      ref={dialogRef}
      className="dialog-backdrop"
      role={role}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
    >
      <div
        ref={cardRef}
        className={
          variant === 'success'
            ? 'dialog-card dialog-card--success'
            : 'dialog-card'
        }
        onClick={handleCardClick}
      >
        <header ref={headerRef} className="dialog-card__header">
          <h2 id={titleId} ref={titleRef} tabIndex={-1}>
            {title}
          </h2>
          <button
            type="button"
            className="icon-button dialog-card__close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>
        {children}
        <div className="dialog-card__footer" onClick={handleCardClick}>
          {actions}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
