import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { isAuthPromptDismissed, setAuthPromptDismissed } from './authPromptStorage.ts';

type UseAuthPromptOptions = {
  user: User | null;
  isConfigured: boolean;
  isAuthLoading: boolean;
  shouldPrompt: boolean;
};

export function useAuthPrompt({
  user,
  isConfigured,
  isAuthLoading,
  shouldPrompt,
}: UseAuthPromptOptions) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openAuthModal = useCallback((): void => {
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback((dismissed: boolean): void => {
    if (dismissed) {
      setAuthPromptDismissed(true);
    }

    setIsAuthModalOpen(false);
  }, []);

  useEffect(() => {
    if (!shouldPrompt || user || !isConfigured || isAuthLoading) {
      return;
    }

    if (!isAuthPromptDismissed()) {
      setIsAuthModalOpen(true);
    }
  }, [shouldPrompt, user, isConfigured, isAuthLoading]);

  return {
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
  };
}
