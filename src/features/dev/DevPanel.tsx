import { useMemo, useState } from 'react';

import { DialogCard } from '../../components/DialogCard.tsx';
import { runDialogButtonAction } from '../../components/dialogAction.ts';
import {
  DEV_PANEL_UNLOCK_TAP_COUNT,
  DEV_PANEL_UNLOCK_WINDOW_MS,
} from '../../lib/dev/useDevPanelUnlock.ts';
import {
  describeLocalAppStateKey,
  listLocalAppStateKeys,
  resetLocalAppState,
} from '../../lib/dev/resetLocalAppState.ts';

type DevPanelProps = {
  isSignedIn: boolean;
  onClose: () => void;
  onSignOut: () => Promise<void>;
};

export function DevPanel({ isSignedIn, onClose, onSignOut }: DevPanelProps) {
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isConfirmingResetAndSignOut, setIsConfirmingResetAndSignOut] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const storedKeys = useMemo(() => {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    return listLocalAppStateKeys(localStorage);
  }, []);

  async function handleReset(includeSignOut: boolean): Promise<void> {
    if (typeof localStorage === 'undefined') {
      setResetError('localStorage is not available in this environment.');
      return;
    }

    setIsResetting(true);
    setResetError(null);

    try {
      if (includeSignOut && isSignedIn) {
        await onSignOut();
      }

      resetLocalAppState(localStorage);
      window.location.reload();
    } catch (error) {
      setIsResetting(false);
      setIsConfirmingReset(false);
      setIsConfirmingResetAndSignOut(false);
      setResetError(error instanceof Error ? error.message : 'Reset failed.');
    }
  }

  if (isConfirmingReset || isConfirmingResetAndSignOut) {
    const includeSignOut = isConfirmingResetAndSignOut;

    return (
      <DialogCard
        title={includeSignOut ? 'Reset local data and sign out?' : 'Reset local data?'}
        titleId="dev-panel-confirm-title"
        messageId="dev-panel-confirm-message"
        role="alertdialog"
        onClose={() => {
          if (isResetting) {
            return;
          }

          setIsConfirmingReset(false);
          setIsConfirmingResetAndSignOut(false);
        }}
        actions={
          <div className="dialog-card__actions dialog-card__actions--stack">
            <button
              type="button"
              className="wizard-button wizard-button--primary"
              disabled={isResetting}
              onClick={() => void handleReset(includeSignOut)}
            >
              {isResetting ? 'Resetting…' : includeSignOut ? 'Reset and sign out' : 'Reset local data'}
            </button>
            <button
              type="button"
              className="wizard-button wizard-button--secondary"
              disabled={isResetting}
              onClick={(event) =>
                runDialogButtonAction(event, () => {
                  setIsConfirmingReset(false);
                  setIsConfirmingResetAndSignOut(false);
                })
              }
            >
              Cancel
            </button>
          </div>
        }
      >
        <p id="dev-panel-confirm-message" className="dialog-card__message">
          This removes saved recipes, drafts, bake sessions, and other on-device flags on this device. Cloud bake
          history in your account is not deleted.
          {includeSignOut ? ' You will also be signed out.' : ''}
        </p>
        {resetError ? (
          <p className="auth-modal__error" role="alert">
            {resetError}
          </p>
        ) : null}
      </DialogCard>
    );
  }

  return (
    <DialogCard
      title="Developer tools"
      titleId="dev-panel-title"
      messageId="dev-panel-message"
      onClose={onClose}
      actions={
        <div className="dialog-card__actions dialog-card__actions--stack">
          <button
            type="button"
            className="wizard-button wizard-button--primary"
            onClick={() => setIsConfirmingReset(true)}
          >
            Reset local data
          </button>
          {isSignedIn ? (
            <button
              type="button"
              className="wizard-button wizard-button--secondary"
              onClick={() => setIsConfirmingResetAndSignOut(true)}
            >
              Reset local data and sign out
            </button>
          ) : null}
          <button
            type="button"
            className="wizard-button wizard-button--secondary"
            onClick={(event) => runDialogButtonAction(event, onClose)}
          >
            Close
          </button>
        </div>
      }
    >
      <p id="dev-panel-message" className="dialog-card__message dev-panel__hint">
        Unlocked by tapping the home title or Home tab {DEV_PANEL_UNLOCK_TAP_COUNT} times within{' '}
        {DEV_PANEL_UNLOCK_WINDOW_MS / 1000} seconds.
      </p>
      <section className="dev-panel__storage" aria-label="Local app state">
        <h3 className="dev-panel__section-title">On-device state</h3>
        {storedKeys.length > 0 ? (
          <ul className="dev-panel__key-list">
            {storedKeys.map((key) => (
              <li key={key}>
                <span className="dev-panel__key-label">{describeLocalAppStateKey(key)}</span>
                <code className="dev-panel__key-code">{key}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dev-panel__empty">No sourdough local keys found.</p>
        )}
      </section>
    </DialogCard>
  );
}
