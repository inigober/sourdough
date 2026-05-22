import { useEffect, useRef, useState } from 'react';

import { UserIcon } from '../../components/icons.tsx';
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

  if (!isConfigured || isLoading) {
    return null;
  }

  if (user) {
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

  if (variant === 'inline') {
    return (
      <div className="welcome-top-bar welcome-top-bar--inline">
        <button type="button" className="wizard-button wizard-button--secondary welcome-top-bar__sign-in" onClick={onOpenAuth}>
          Sign in
        </button>
      </div>
    );
  }

  return (
    <header className="app-header welcome-top-bar">
      <button type="button" className="wizard-button wizard-button--secondary welcome-top-bar__sign-in" onClick={onOpenAuth}>
        Sign in
      </button>
    </header>
  );
}
