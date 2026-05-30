// src/features/auth/AuthProvider.tsx
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import type { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured, requireSupabaseClient, supabase } from '@/lib/supabase';

import { toFriendlyAuthError } from './authErrors';

type AuthContextValue = {
  authError?: string;
  loading: boolean;
  magicLinkSignIn: (email: string) => Promise<void>;
  profileError?: string;
  session: Session | null;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  user: User | null;
};

type AuthProviderProps = {
  children: ReactNode;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

function getDisplayName(user: User) {
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;

  if (typeof metadataName === 'string' && metadataName.trim().length > 0) {
    return metadataName.trim();
  }

  const emailName = user.email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim();

  return emailName && emailName.length > 0 ? emailName : 'Date Night Partner';
}

async function ensureUserProfile(user: User) {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return;
  }

  const { error: insertError } = await client.from('profiles').insert({
    display_name: getDisplayName(user),
    email: user.email,
    id: user.id,
    timezone: getTimezone(),
  });

  if (insertError && insertError.code !== '23505') {
    throw insertError;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | undefined>();
  const [profileError, setProfileError] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;

    async function settleSession(nextSession: Session | null) {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setProfileError(undefined);

      if (!nextSession?.user) {
        return;
      }

      try {
        await ensureUserProfile(nextSession.user);
      } catch (error) {
        if (isMounted) {
          setProfileError(toFriendlyAuthError(error));
        }
      }
    }

    async function initializeSession() {
      if (!supabase) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      const { data, error } = await supabase.auth.getSession();

      if (error && isMounted) {
        setAuthError(toFriendlyAuthError(error));
      }

      await settleSession(data.session);

      if (isMounted) {
        setLoading(false);
      }
    }

    const authSubscription = supabase?.auth.onAuthStateChange((_event, nextSession) => {
      setLoading(true);
      void settleSession(nextSession).finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    }).data.subscription;

    void initializeSession();

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  async function magicLinkSignIn(email: string) {
    const client = requireSupabaseClient();
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await client.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: Linking.createURL('/'),
      },
    });

    if (error) {
      throw new Error(toFriendlyAuthError(error));
    }
  }

  async function signOut() {
    const client = requireSupabaseClient();
    setLoading(true);

    try {
      const { error } = await client.auth.signOut();

      if (error) {
        throw new Error(toFriendlyAuthError(error));
      }

      setSession(null);
    } finally {
      setLoading(false);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      authError,
      loading,
      magicLinkSignIn,
      profileError,
      session,
      signIn: magicLinkSignIn,
      signOut,
      user: session?.user ?? null,
    }),
    [authError, loading, profileError, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}

export { isSupabaseConfigured };
