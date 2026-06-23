import { useEffect, useState, type FormEvent } from 'react';

import { CloseIcon, EyeIcon, EyeOffIcon } from '../../components/icons.tsx';
import { CLOUD_SYNC_UNAVAILABLE_COPY } from '../../lib/auth/cloudSyncCopy.ts';
import { useAuth } from '../../lib/auth/useAuth.ts';

type AuthModalStep = 'choose' | 'signIn' | 'signUp';

type AuthModalProps = {
  onClose: (dismissed: boolean) => void;
  initialStep?: AuthModalStep;
};

export function AuthModal({ onClose, initialStep = 'choose' }: AuthModalProps) {
  const {
    isConfigured,
    isLoading,
    user,
    authError,
    authMessage,
    clearAuthError,
    clearAuthMessage,
    signIn,
    signUp,
  } = useAuth();
  const [step, setStep] = useState<AuthModalStep>(initialStep);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      onClose(false);
    }
  }, [onClose, user]);

  function goToStep(nextStep: AuthModalStep): void {
    clearAuthError();
    clearAuthMessage();
    setStep(nextStep);
  }

  function handleBackdropClick(): void {
    onClose(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    clearAuthError();
    clearAuthMessage();
    setIsSubmitting(true);

    try {
      if (step === 'signIn') {
        await signIn(email.trim(), password);
      } else if (step === 'signUp') {
        const result = await signUp(email.trim(), password);
        if (result === 'needs_confirmation') {
          setStep('signIn');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={handleBackdropClick}>
      <div
        className="dialog-card auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="auth-modal__close"
          aria-label="Close"
          onClick={() => onClose(true)}
        >
          <CloseIcon />
        </button>

        {!isConfigured ? (
          <>
            <div className="auth-modal__intro">
              <h2 id="auth-modal-title">Cloud sync unavailable</h2>
              <p className="section-copy">{CLOUD_SYNC_UNAVAILABLE_COPY}</p>
            </div>
            <button
              type="button"
              className="wizard-button wizard-button--secondary auth-modal__submit"
              onClick={() => onClose(true)}
            >
              Close
            </button>
          </>
        ) : isLoading ? (
          <p className="auth-modal__status">Checking account…</p>
        ) : step === 'choose' ? (
          <>
            <div className="auth-modal__intro">
              <h2 id="auth-modal-title">Sync your recipes</h2>
              <p className="section-copy">
                Save recipes in the cloud and pick them up on another device.
              </p>
            </div>
            <div className="auth-modal__choices">
              <button
                type="button"
                className="wizard-button wizard-button--primary auth-modal__choice"
                onClick={() => goToStep('signIn')}
              >
                Sign in
              </button>
              <button
                type="button"
                className="wizard-button wizard-button--secondary auth-modal__choice"
                onClick={() => goToStep('signUp')}
              >
                Create account
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="auth-modal__intro">
              <button type="button" className="auth-modal__back" onClick={() => goToStep('choose')}>
                Back
              </button>
              <h2 id="auth-modal-title">{step === 'signIn' ? 'Sign in' : 'Create account'}</h2>
              <p className="section-copy">
                {step === 'signIn'
                  ? 'Welcome back. Enter your account details.'
                  : 'Create an account to sync recipes across devices.'}
              </p>
            </div>
            <form className="auth-modal__form" onSubmit={(event) => void handleSubmit(event)}>
              <label className="field-card">
                <span className="field-label-row">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  required
                />
              </label>
              <label className="field-card">
                <span className="field-label-row">Password</span>
                <div className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={step === 'signIn' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                    onFocus={() => setPasswordFocused(true)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="password-field__toggle icon-button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {passwordFocused ? (
                  <span className="field-hint">At least 6 characters.</span>
                ) : null}
              </label>
              {authMessage ? <p className="auth-modal__message">{authMessage}</p> : null}
              {authError ? <p className="auth-modal__error">{authError}</p> : null}
              <button
                type="submit"
                className="wizard-button wizard-button--primary auth-modal__submit"
                disabled={isSubmitting}
              >
                {step === 'signIn' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
