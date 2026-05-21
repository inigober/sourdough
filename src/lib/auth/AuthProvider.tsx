import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { formatAuthError } from './formatAuthError.ts';
import { isSupabaseConfigured } from './config.ts';
import { getSupabaseClient } from './supabaseClient.ts';

type AuthContextValue = {
  isConfigured: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  authError: string | null;
  authMessage: string | null;
  clearAuthError: () => void;
  clearAuthMessage: () => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<'signed_in' | 'needs_confirmation' | 'failed'>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const isConfigured = isSupabaseConfigured();
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const clearAuthMessage = useCallback(() => {
    setAuthMessage(null);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      if (!supabase) {
        setAuthError('Cloud sync is not configured.');
        return false;
      }

      setAuthError(null);
      setAuthMessage(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(formatAuthError(error.message));
        return false;
      }

      return true;
    },
    [supabase],
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<'signed_in' | 'needs_confirmation' | 'failed'> => {
      if (!supabase) {
        setAuthError('Cloud sync is not configured.');
        return 'failed';
      }

      setAuthError(null);
      setAuthMessage(null);
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setAuthError(formatAuthError(error.message));
        return 'failed';
      }

      if (data.session) {
        return 'signed_in';
      }

      setAuthMessage('Account created. Check your email to confirm, then sign in.');
      return 'needs_confirmation';
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) {
      return;
    }

    setAuthError(null);
    setAuthMessage(null);
    await supabase.auth.signOut();
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured,
      isLoading,
      session,
      user: session?.user ?? null,
      authError,
      authMessage,
      clearAuthError,
      clearAuthMessage,
      signIn,
      signUp,
      signOut,
    }),
    [authError, authMessage, clearAuthError, clearAuthMessage, isConfigured, isLoading, session, signIn, signOut, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
