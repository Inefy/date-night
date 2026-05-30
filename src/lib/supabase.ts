// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export type SupabaseConnectionTestResult = {
  message: string;
  ok: boolean;
  skipped?: boolean;
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

// The publishable key is intentionally public in Expo client apps. It is safe
// only when Supabase Row Level Security policies enforce what each user can read/write.
// Never put a service role key or other privileged secret in this app bundle.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabasePublishableKey as string, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: AsyncStorage,
      },
    })
  : null;

export function requireSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  return supabase;
}

export async function testSupabaseConnection(): Promise<SupabaseConnectionTestResult> {
  if (process.env.NODE_ENV === 'production') {
    return {
      message: 'Supabase connection test is disabled in production builds.',
      ok: false,
      skipped: true,
    };
  }

  if (!supabaseUrl || !supabasePublishableKey) {
    return {
      message: 'Supabase environment variables are not set.',
      ok: false,
      skipped: true,
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        apikey: supabasePublishableKey,
      },
    });

    if (!response.ok) {
      return {
        message: `Supabase responded with HTTP ${response.status}.`,
        ok: false,
      };
    }

    return {
      message: 'Supabase connection test succeeded.',
      ok: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Supabase connection test failed.',
      ok: false,
    };
  }
}
