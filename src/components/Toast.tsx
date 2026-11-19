type ToastProps = {
  message: string;
  /** Optional button inside the toast (for example "Undo"). Needs `onAction`. */
  actionLabel?: string;
  onAction?: () => void;
  /** `above-footer` lifts the toast over a sticky footer such as the bake-mode navigation. */
  placement?: 'bottom' | 'above-footer';
};

export function Toast({ message, actionLabel, onAction, placement = 'bottom' }: ToastProps) {
  const hasAction = Boolean(actionLabel && onAction);
  const className = [
    'toast',
    hasAction ? 'toast--with-action' : '',
    placement === 'above-footer' ? 'toast--above-footer' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} role="status" aria-live="polite">
      <span>{message}</span>
      {hasAction ? (
        <button type="button" className="toast__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
