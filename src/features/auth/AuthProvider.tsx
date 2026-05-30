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
  magicLinkSignIn: (email: string, options?: SignInOptions) => Promise<void>;
  profileError?: string;
  session: Session | null;
  signIn: (email: string, options?: SignInOptions) => Promise<void>;
  signOut: () => Promise<void>;
  user: User | null;
};

type AuthProviderProps = {
  children: ReactNode;
};

type SignInOptions = {
  returnTo?: string;
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

function getUrlParams(url: string) {
  const parsedUrl = new URL(url);
  const params = new URLSearchParams(parsedUrl.search);
  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));

  hashParams.forEach((value, key) => {
    if (!params.has(key)) {
      params.set(key, value);
    }
  });

  return params;
}

function getAuthRedirectTo(returnTo?: string) {
  return returnTo
    ? Linking.createURL('/sign-in', { queryParams: { returnTo } })
    : Linking.createURL('/sign-in');
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
    const handledAuthUrls = new Set<string>();

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

    async function handleAuthRedirectUrl(url: string) {
      if (!supabase || handledAuthUrls.has(url)) {
        return false;
      }

      let params: URLSearchParams;

      try {
        params = getUrlParams(url);
      } catch {
        return false;
      }

      const errorCode = params.get('error_code') ?? params.get('error');

      if (errorCode) {
        throw new Error(params.get('error_description') ?? errorCode);
      }

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const code = params.get('code');

      if (accessToken && refreshToken) {
        handledAuthUrls.add(url);
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          throw error;
        }

        await settleSession(data.session);
        return true;
      }

      if (code) {
        handledAuthUrls.add(url);
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          throw error;
        }

        await settleSession(data.session);
        return true;
      }

      return false;
    }

    async function initializeSession() {
      if (!supabase) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const initialUrl = await Linking.getInitialURL();

        if (initialUrl) {
          await handleAuthRedirectUrl(initialUrl);
        }
      } catch (error) {
        if (isMounted) {
          setAuthError(toFriendlyAuthError(error));
        }
      }

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

    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      setLoading(true);
      void handleAuthRedirectUrl(url)
        .catch((error) => {
          if (isMounted) {
            setAuthError(toFriendlyAuthError(error));
          }
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    });

    void initializeSession();

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  async function magicLinkSignIn(email: string, options: SignInOptions = {}) {
    const client = requireSupabaseClient();
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await client.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: getAuthRedirectTo(options.returnTo),
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
