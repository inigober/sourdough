import { useEffect, useState } from 'react';

type ToastProps = {
  message: string;
  /** Optional button inside the toast (for example "Undo"). Needs `onAction`. */
  actionLabel?: string;
  onAction?: () => void;
  /** `above-footer` lifts the toast over a sticky footer such as the bake-mode navigation. */
  placement?: 'bottom' | 'above-footer';
  /**
   * Called with true while a finger, pointer or screen-reader cursor is on the toast, and false when
   * it leaves. A toast that disappears on a timer should pause the timer while it is held, because
   * VoiceOver users need longer than 8 seconds to swipe to a button.
   */
  onHoldChange?: (isHeld: boolean) => void;
};

export function Toast({ message, actionLabel, onAction, placement = 'bottom', onHoldChange }: ToastProps) {
  const hasAction = Boolean(actionLabel && onAction);
  const className = [
    'toast',
    hasAction ? 'toast--with-action' : '',
    placement === 'above-footer' ? 'toast--above-footer' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // A live region that already contains text when it is inserted is often not announced. So the
  // region is inserted empty and filled a moment later; that change is what gets read out.
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    const timeout = window.setTimeout(() => setAnnouncement(hasAction ? `${message} ${actionLabel} is available.` : message), 60);
    return () => window.clearTimeout(timeout);
  }, [actionLabel, hasAction, message]);

  return (
    <div
      className={className}
      onFocus={() => onHoldChange?.(true)}
      onBlur={() => onHoldChange?.(false)}
      onPointerEnter={() => onHoldChange?.(true)}
      onPointerLeave={() => onHoldChange?.(false)}
    >
      <span className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </span>
      <span aria-hidden="true">{message}</span>
      {hasAction ? (
        <button type="button" className="toast__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
