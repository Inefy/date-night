// src/features/settings/profileService.ts
import { requireSupabaseClient } from '@/lib/supabase';

export type UserProfileSummary = {
  displayName: string;
  email?: string;
};

type ProfileRow = {
  display_name: string;
  email?: string | null;
};

function sanitizeDisplayName(displayName: string) {
  const trimmedDisplayName = displayName.trim().replace(/\s+/g, ' ');

  if (trimmedDisplayName.length < 2) {
    throw new Error('Display name must be at least 2 characters.');
  }

  return trimmedDisplayName.slice(0, 80);
}

function toFriendlyProfileError(error: unknown) {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const message = rawMessage.toLowerCase();

  if (message.includes('row-level security') || message.includes('permission denied')) {
    return 'Your profile could not be updated from this account.';
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return 'We could not reach profile sync. Check your connection and try again.';
  }

  return rawMessage || 'Profile could not be updated right now.';
}

function mapProfile(row: ProfileRow): UserProfileSummary {
  return {
    displayName: row.display_name,
    email: row.email ?? undefined,
  };
}

export async function getUserProfile(userId: string): Promise<UserProfileSummary | undefined> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .select('display_name, email')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new Error(toFriendlyProfileError(error));
  }

  return data ? mapProfile(data) : undefined;
}

export async function updateUserDisplayName({
  displayName,
  userId,
}: {
  displayName: string;
  userId: string;
}): Promise<UserProfileSummary> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .update({ display_name: sanitizeDisplayName(displayName) })
    .eq('id', userId)
    .select('display_name, email')
    .single<ProfileRow>();

  if (error) {
    throw new Error(toFriendlyProfileError(error));
  }

  return mapProfile(data);
}
