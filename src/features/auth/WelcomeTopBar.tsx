import { useEffect, useRef, useState } from 'react';

import { UserIcon } from '../../components/icons.tsx';
import { CLOUD_SYNC_UNAVAILABLE_COPY } from '../../lib/auth/cloudSyncCopy.ts';
import { useAuth } from '../../lib/auth/useAuth.ts';

type WelcomeTopBarProps = {
  onOpenAuth: () => void;
  variant?: 'inline' | 'header';
};

export function WelcomeTopBar({ onOpenAuth, variant = 'header' }: WelcomeTopBarProps) {
  const { isConfigured, isLoading, user, signOut } = useAuth();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAccountMenu) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node) || menuRef.current?.contains(target)) {
        return;
      }

      setShowAccountMenu(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showAccountMenu]);

  if (user) {
    if (!isConfigured || isLoading) {
      return null;
    }

    return (
      <div className={variant === 'inline' ? 'welcome-top-bar welcome-top-bar--inline' : 'app-header welcome-top-bar'}>
        <div className="welcome-top-bar__account" ref={menuRef}>
          <button
            type="button"
            className="app-header__home wizard-icon-button"
            aria-expanded={showAccountMenu}
            aria-haspopup="menu"
            aria-label={`Account: ${user.email ?? 'signed in'}`}
            onClick={() => setShowAccountMenu((current) => !current)}
          >
            <UserIcon />
          </button>
          {showAccountMenu ? (
            <div className="welcome-top-bar__menu" role="menu">
              <p className="welcome-top-bar__menu-email">{user.email}</p>
              <button
                type="button"
                className="welcome-top-bar__menu-action"
                role="menuitem"
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (isLoading && isConfigured) {
    return null;
  }

  const wrapperClass =
    variant === 'inline' ? 'welcome-top-bar welcome-top-bar--inline' : 'app-header welcome-top-bar';

  return (
    <div className={wrapperClass}>
      <div className="welcome-top-bar__sign-in-group">
        <button
          type="button"
          className="wizard-button wizard-button--secondary welcome-top-bar__sign-in"
          onClick={onOpenAuth}
        >
          Sign in
        </button>
        {!isConfigured ? (
          <p className="welcome-top-bar__sync-hint" role="status">
            {CLOUD_SYNC_UNAVAILABLE_COPY}
          </p>
        ) : null}
      </div>
    </div>
  );
}
