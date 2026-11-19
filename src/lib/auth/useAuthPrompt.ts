import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { setAuthPromptDismissed, shouldOfferAuthPrompt } from './authPromptStorage.ts';

type UseAuthPromptOptions = {
  user: User | null;
  isConfigured: boolean;
  isAuthLoading: boolean;
  /** True while the baker is on the Home screen, the only place the sync offer may appear. */
  isOnHome: boolean;
};

export function useAuthPrompt({ user, isConfigured, isAuthLoading, isOnHome }: UseAuthPromptOptions) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOfferPending, setIsOfferPending] = useState(false);

  const openAuthModal = useCallback((): void => {
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback((dismissed: boolean): void => {
    if (dismissed) {
      setAuthPromptDismissed(true);
    }

    setIsAuthModalOpen(false);
  }, []);

  /** Call after a recipe is saved. The offer waits until the baker is back on Home. */
  const offerAuthAfterSave = useCallback((): void => {
    setIsOfferPending(true);
  }, []);

  useEffect(() => {
    if (!isOfferPending || !isOnHome || isAuthLoading) {
      return;
    }

    setIsOfferPending(false);

    if (shouldOfferAuthPrompt({ isSignedIn: Boolean(user), isConfigured })) {
      setIsAuthModalOpen(true);
    }
  }, [isOfferPending, isOnHome, isAuthLoading, user, isConfigured]);

  return {
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    offerAuthAfterSave,
  };
}
