// src/features/couple/coupleService.ts
import * as Linking from 'expo-linking';
import { Share } from 'react-native';

import { requireSupabaseClient } from '@/lib/supabase';
import {
  createDefaultDateNightPreferences,
  type DateNightPreferences,
} from '@/features/preferences/preferencesTypes';
import { normalizePreferences } from '@/features/preferences/preferencesValidator';

import { toFriendlyCoupleError } from './coupleErrors';
import type { CoupleInvite, CoupleInviteSummary, CoupleMemberSummary, CoupleProfile } from './coupleTypes';

type ActiveMembershipRow = {
  couple_id: string;
  display_name: string;
  id: string;
  joined_at: string;
  role: 'primary' | 'partner';
  user_id: string;
};

type CoupleRow = {
  default_preferences?: Record<string, unknown> | null;
  id: string;
  name?: string | null;
};

type CoupleInviteRow = {
  accepted_at?: string | null;
  expires_at?: string | null;
  id: string;
  revoked_at?: string | null;
  token: string;
};

type CoupleRpcRow = {
  couple_id: string;
  member_id: string;
};

type InviteRpcRow = {
  expires_at?: string | null;
  invite_id: string;
  token: string;
};

function isStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mapDatabasePreferences(value: Record<string, unknown> | null | undefined): DateNightPreferences {
  if (!value || Object.keys(value).length === 0) {
    return createDefaultDateNightPreferences();
  }

  const candidatePreferences = {
    defaultBudget: typeof value.default_budget === 'string' ? value.default_budget : undefined,
    defaultDurationMinutes:
      typeof value.default_duration_minutes === 'number' ? value.default_duration_minutes : undefined,
    defaultEnergy: typeof value.default_energy === 'string' ? value.default_energy : undefined,
    defaultLocationMode:
      typeof value.default_location_mode === 'string' ? value.default_location_mode : undefined,
    dietaryPreferences: isStringArray(value.dietary_preferences),
    foodPreferences: isStringArray(value.food_preferences),
    preferredVibes: isStringArray(value.preferred_vibes),
    rainyIndoorPreference:
      typeof value.rainy_indoor_preference === 'string' ? value.rainy_indoor_preference : undefined,
  } as Partial<DateNightPreferences>;

  return normalizePreferences(candidatePreferences);
}

function mapMember(row: ActiveMembershipRow, currentUserId: string): CoupleMemberSummary {
  return {
    displayName: row.display_name,
    id: row.id,
    isCurrentUser: row.user_id === currentUserId,
    joinedAt: row.joined_at,
    role: row.role,
    userId: row.user_id,
  };
}

function getPendingInvite(invites: CoupleInviteRow[]): CoupleInviteSummary | undefined {
  const now = Date.now();
  const invite = invites.find((candidate) => {
    const expiresAt = candidate.expires_at ? Date.parse(candidate.expires_at) : undefined;

    return !candidate.accepted_at && !candidate.revoked_at && (!expiresAt || expiresAt > now);
  });

  return invite
    ? {
        expiresAt: invite.expires_at ?? undefined,
        id: invite.id,
        token: invite.token,
      }
    : undefined;
}

function sanitizeText(value: string) {
  const normalized = value.trim();

  return normalized.length > 0 ? normalized : undefined;
}

export function extractInviteToken(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    const queryToken = parsedUrl.searchParams.get('invite') ?? parsedUrl.searchParams.get('token');

    if (queryToken) {
      return queryToken.trim();
    }
  } catch {
    // Bare invite codes are expected here.
  }

  const inviteMatch = trimmedValue.match(/[?&](?:invite|token)=([^&#]+)/);

  if (inviteMatch?.[1]) {
    return decodeURIComponent(inviteMatch[1]).trim();
  }

  return trimmedValue;
}

export function buildCoupleInviteLink(token: string) {
  return Linking.createURL('/onboarding/couple-setup', {
    queryParams: { invite: token },
  });
}

export async function shareCoupleInvite(invite: CoupleInvite) {
  await Share.share({
    message: `Join my Date Night Deck couple deck: ${invite.link}`,
    title: 'Join my Date Night Deck',
    url: invite.link,
  });
}

export async function getCurrentActiveMembership(userId: string): Promise<ActiveMembershipRow | undefined> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('couple_members')
    .select('couple_id, display_name, id, joined_at, role, user_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('left_at', null)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle<ActiveMembershipRow>();

  if (error) {
    throw new Error(toFriendlyCoupleError(error));
  }

  return data ?? undefined;
}

export async function getActiveCoupleProfile(userId: string): Promise<CoupleProfile | undefined> {
  const client = requireSupabaseClient();
  const membership = await getCurrentActiveMembership(userId);

  if (!membership) {
    return undefined;
  }

  const { data: couple, error: coupleError } = await client
    .from('couples')
    .select('default_preferences, id, name')
    .eq('id', membership.couple_id)
    .single<CoupleRow>();

  if (coupleError) {
    throw new Error(toFriendlyCoupleError(coupleError));
  }

  const { data: memberRows, error: membersError } = await client
    .from('couple_members')
    .select('couple_id, display_name, id, joined_at, role, user_id')
    .eq('couple_id', membership.couple_id)
    .eq('is_active', true)
    .is('left_at', null)
    .order('role', { ascending: true });

  if (membersError) {
    throw new Error(toFriendlyCoupleError(membersError));
  }

  const { data: inviteRows, error: invitesError } = await client
    .from('couple_invites')
    .select('accepted_at, expires_at, id, revoked_at, token')
    .eq('couple_id', membership.couple_id)
    .order('created_at', { ascending: false })
    .limit(8);

  if (invitesError) {
    throw new Error(toFriendlyCoupleError(invitesError));
  }

  return {
    defaultPreferences: mapDatabasePreferences(couple.default_preferences),
    id: couple.id,
    members: (memberRows as ActiveMembershipRow[]).map((member) => mapMember(member, userId)),
    name: couple.name ?? undefined,
    pendingInvite: getPendingInvite((inviteRows ?? []) as CoupleInviteRow[]),
  };
}

export async function createCoupleWithMember({
  coupleName,
  displayName,
  userId,
}: {
  coupleName: string;
  displayName: string;
  userId: string;
}): Promise<CoupleRpcRow> {
  const client = requireSupabaseClient();
  const existingMembership = await getCurrentActiveMembership(userId);

  if (existingMembership) {
    throw new Error(toFriendlyCoupleError('already in a couple'));
  }

  const { data, error } = await client
    .rpc('create_couple_with_member', {
      p_display_name: sanitizeText(displayName) ?? null,
      p_name: sanitizeText(coupleName) ?? null,
    })
    .single<CoupleRpcRow>();

  if (error) {
    throw new Error(toFriendlyCoupleError(error));
  }

  return data;
}

export async function acceptCoupleInvite({
  displayName,
  rawInviteToken,
  userId,
}: {
  displayName: string;
  rawInviteToken: string;
  userId: string;
}): Promise<CoupleRpcRow> {
  const client = requireSupabaseClient();
  const token = extractInviteToken(rawInviteToken);

  if (token.length < 12) {
    throw new Error(toFriendlyCoupleError('invalid invite'));
  }

  const existingMembership = await getCurrentActiveMembership(userId);

  if (existingMembership) {
    throw new Error(toFriendlyCoupleError('already in a couple'));
  }

  const { data, error } = await client
    .rpc('accept_couple_invite', {
      p_display_name: sanitizeText(displayName) ?? null,
      p_token: token,
    })
    .single<CoupleRpcRow>();

  if (error) {
    throw new Error(toFriendlyCoupleError(error));
  }

  return data;
}

export async function createCoupleInvite(coupleId: string): Promise<CoupleInvite> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .rpc('create_couple_invite', {
      p_couple_id: coupleId,
    })
    .single<InviteRpcRow>();

  if (error) {
    throw new Error(toFriendlyCoupleError(error));
  }

  return {
    expiresAt: data.expires_at ?? undefined,
    id: data.invite_id,
    link: buildCoupleInviteLink(data.token),
    token: data.token,
  };
}
