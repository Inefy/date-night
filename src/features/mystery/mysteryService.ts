// src/features/mystery/mysteryService.ts
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

import { buildCoupleInviteLink } from '@/features/couple/coupleService';
import {
  getGeneratedDateById,
  isPersistedGeneratedDateId,
} from '@/features/generatedDates/generatedDateService';
import { requireSupabaseClient } from '@/lib/supabase';
import type { GeneratedDatePlan, RevealStyle } from '@/types/domain';

export const mysteryRevealStyleOptions: Array<{
  description: string;
  label: string;
  value: RevealStyle;
}> = [
  {
    description: 'A classic card reveal for the partner who likes the deck ritual.',
    label: 'Deck flip',
    value: 'deck_flip',
  },
  {
    description: 'A quieter reveal that feels like opening a private note.',
    label: 'Sealed envelope',
    value: 'sealed_envelope',
  },
  {
    description: 'A playful reveal for a date that should feel a little surprising.',
    label: 'Scratch card',
    value: 'scratch_card',
  },
];

export const mysteryRevealStyleLabels: Record<RevealStyle, string> = {
  deck_flip: 'Deck flip',
  scratch_card: 'Scratch card',
  sealed_envelope: 'Sealed envelope',
};

export const mysteryLinkConfig = {
  developmentScheme: 'datenightdeck',
  productionBaseUrl: 'https://datenightdeck.app',
} as const;

export type CreatedMysteryDate = {
  generatedDateId: string;
  inviteExpiresAt?: string;
  inviteLink?: string;
  inviteToken?: string;
  mysteryDateId: string;
  token: string;
};

export type MysteryDateSummary = {
  coupleId: string;
  createdAt: string;
  expiresAt?: string;
  generatedDateId: string;
  id: string;
  revealStyle: RevealStyle;
  revealedAt?: string;
  teaser: string;
  token: string;
};

export type MysteryAccessStatus =
  | 'auth_required'
  | 'couple_full'
  | 'expired'
  | 'invalid'
  | 'join_available'
  | 'locked'
  | 'revealed'
  | 'wrong_couple';

export type ResolvedMysteryDateAccess = {
  inviteExpiresAt?: string;
  inviteLink?: string;
  inviteToken?: string;
  mysteryDate?: MysteryDateSummary;
  status: MysteryAccessStatus;
};

type CreateMysteryDateInput = {
  coupleId: string;
  createInvite?: boolean;
  creatorMessage?: string;
  generatedDateId?: string;
  plan: GeneratedDatePlan;
  revealStyle: RevealStyle;
};

type MysteryRpcRow = {
  generated_date_id: string;
  invite_expires_at?: string | null;
  invite_token?: string | null;
  mystery_date_id: string;
  token: string;
};

type MysteryAccessRpcRow = {
  couple_id?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  generated_date_id?: string | null;
  invite_expires_at?: string | null;
  invite_token?: string | null;
  mystery_date_id?: string | null;
  reveal_style?: RevealStyle | null;
  revealed_at?: string | null;
  status: string;
  teaser?: string | null;
};

type MysteryDateRow = {
  couple_id: string;
  created_at: string;
  expires_at?: string | null;
  generated_date_id: string;
  id: string;
  reveal_style: RevealStyle;
  revealed_at?: string | null;
  teaser: string;
  token: string;
};

function toFriendlyMysteryError(error: unknown): string {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const message = rawMessage.toLowerCase();

  if (message.includes('authentication required')) {
    return 'Sign in before creating a mystery card.';
  }

  if (message.includes('mystery dates require a couple')) {
    return 'Create or join a couple deck before locking a mystery date.';
  }

  if (message.includes('generated date not found')) {
    return 'That generated date could not be found. Draw a fresh card and try again.';
  }

  if (message.includes('only active couple members')) {
    return 'Only active couple members can create or open this mystery card.';
  }

  if (message.includes('mystery date has expired')) {
    return 'This mystery card link has expired.';
  }

  if (message.includes('mystery date not found')) {
    return 'This mystery card link is invalid.';
  }

  if (message.includes('invalid reveal style')) {
    return 'Choose a valid reveal style.';
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return 'We could not reach the mystery deck. Check your connection and try again.';
  }

  return rawMessage || 'Mystery card could not be created right now.';
}

function asMysteryAccessStatus(status: string): MysteryAccessStatus {
  const allowedStatuses: MysteryAccessStatus[] = [
    'auth_required',
    'couple_full',
    'expired',
    'invalid',
    'join_available',
    'locked',
    'revealed',
    'wrong_couple',
  ];

  return allowedStatuses.includes(status as MysteryAccessStatus)
    ? (status as MysteryAccessStatus)
    : 'invalid';
}

function sanitizeOptionalText(value?: string) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : undefined;
}

export function isValidMysteryToken(token: string) {
  return /^[A-Za-z0-9_-]{16,256}$/.test(token);
}

export function buildMysteryLink(token: string, environment: 'development' | 'production' = __DEV__ ? 'development' : 'production') {
  const encodedToken = encodeURIComponent(token);

  if (environment === 'development') {
    return `${mysteryLinkConfig.developmentScheme}://mystery/${encodedToken}`;
  }

  return `${mysteryLinkConfig.productionBaseUrl}/mystery/${encodedToken}`;
}

export function parseMysteryLink(url: string): { token: string } | undefined {
  try {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol.replace(':', '');
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    let token: string | undefined;

    if (protocol === 'https' && parsedUrl.hostname === 'datenightdeck.app') {
      token = pathParts[0] === 'mystery' ? pathParts[1] : undefined;
    }

    if (protocol === mysteryLinkConfig.developmentScheme) {
      token =
        parsedUrl.hostname === 'mystery'
          ? pathParts[0]
          : pathParts[0] === 'mystery'
            ? pathParts[1]
            : undefined;
    }

    if (!token) {
      return undefined;
    }

    const decodedToken = decodeURIComponent(token);

    return isValidMysteryToken(decodedToken) ? { token: decodedToken } : undefined;
  } catch {
    const match = url.match(/(?:^|\/)mystery\/([A-Za-z0-9_-]{16,256})(?:[?#]|$)/);

    return match?.[1] ? { token: match[1] } : undefined;
  }
}

export function buildMysteryShareMessage(token: string) {
  const mysteryLink = buildMysteryLink(token);

  return `I made us a mystery date. No peeking until you open it: ${mysteryLink}`;
}

export async function shareMysteryCard({
  token,
}: {
  token: string;
}) {
  const mysteryLink = buildMysteryLink(token);

  await Share.share({
    message: buildMysteryShareMessage(token),
    title: 'Date Night Deck mystery card',
    url: mysteryLink,
  });
}

export async function copyMysteryLink(token: string) {
  await Clipboard.setStringAsync(buildMysteryLink(token));
}

export async function createMysteryDate({
  coupleId,
  createInvite,
  creatorMessage,
  generatedDateId,
  plan,
  revealStyle,
}: CreateMysteryDateInput): Promise<CreatedMysteryDate> {
  const client = requireSupabaseClient();
  const persistedGeneratedDateId =
    generatedDateId && isPersistedGeneratedDateId(generatedDateId) ? generatedDateId : null;
  const { data, error } = await client
    .rpc('create_mystery_date', {
      p_couple_id: coupleId,
      p_create_invite: Boolean(createInvite),
      p_creator_message: sanitizeOptionalText(creatorMessage) ?? null,
      p_filters: { sourceTemplateId: plan.sourceTemplateId },
      p_generated_date_id: persistedGeneratedDateId,
      p_plan: plan,
      p_reveal_style: revealStyle,
      p_teaser: sanitizeOptionalText(creatorMessage) ?? plan.shareTeaser,
    })
    .single<MysteryRpcRow>();

  if (error) {
    throw new Error(toFriendlyMysteryError(error));
  }

  return {
    generatedDateId: data.generated_date_id,
    inviteExpiresAt: data.invite_expires_at ?? undefined,
    inviteLink: data.invite_token ? buildCoupleInviteLink(data.invite_token) : undefined,
    inviteToken: data.invite_token ?? undefined,
    mysteryDateId: data.mystery_date_id,
    token: data.token,
  };
}

export async function getMysteryDateByToken(token: string): Promise<MysteryDateSummary | undefined> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('mystery_dates')
    .select('couple_id, created_at, expires_at, generated_date_id, id, reveal_style, revealed_at, teaser, token')
    .eq('token', token)
    .maybeSingle<MysteryDateRow>();

  if (error) {
    throw new Error(toFriendlyMysteryError(error));
  }

  if (!data) {
    return undefined;
  }

  return {
    coupleId: data.couple_id,
    createdAt: data.created_at,
    expiresAt: data.expires_at ?? undefined,
    generatedDateId: data.generated_date_id,
    id: data.id,
    revealStyle: data.reveal_style,
    revealedAt: data.revealed_at ?? undefined,
    teaser: data.teaser,
    token: data.token,
  };
}

function mapMysteryDateRow(row: MysteryDateRow): MysteryDateSummary {
  return {
    coupleId: row.couple_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? undefined,
    generatedDateId: row.generated_date_id,
    id: row.id,
    revealStyle: row.reveal_style,
    revealedAt: row.revealed_at ?? undefined,
    teaser: row.teaser,
    token: row.token,
  };
}

function mapMysteryAccessRow(row: MysteryAccessRpcRow, token: string): ResolvedMysteryDateAccess {
  const status = asMysteryAccessStatus(row.status);
  const hasMysteryDate =
    Boolean(row.couple_id) &&
    Boolean(row.created_at) &&
    Boolean(row.generated_date_id) &&
    Boolean(row.mystery_date_id) &&
    Boolean(row.reveal_style);

  return {
    inviteExpiresAt: row.invite_expires_at ?? undefined,
    inviteLink: row.invite_token ? buildCoupleInviteLink(row.invite_token) : undefined,
    inviteToken: row.invite_token ?? undefined,
    mysteryDate: hasMysteryDate
      ? {
          coupleId: row.couple_id as string,
          createdAt: row.created_at as string,
          expiresAt: row.expires_at ?? undefined,
          generatedDateId: row.generated_date_id as string,
          id: row.mystery_date_id as string,
          revealStyle: row.reveal_style as RevealStyle,
          revealedAt: row.revealed_at ?? undefined,
          teaser: row.teaser ?? 'A mystery date is waiting for you.',
          token,
        }
      : undefined,
    status,
  };
}

export async function resolveMysteryDateAccess(token: string): Promise<ResolvedMysteryDateAccess> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .rpc('resolve_mystery_date_access', {
      p_token: token,
    })
    .single<MysteryAccessRpcRow>();

  if (error) {
    throw new Error(toFriendlyMysteryError(error));
  }

  return mapMysteryAccessRow(data, token);
}

export async function revealMysteryDate(token: string): Promise<MysteryDateSummary> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .rpc('reveal_mystery_date', {
      p_token: token,
    })
    .single<MysteryDateRow>();

  if (error) {
    throw new Error(toFriendlyMysteryError(error));
  }

  return mapMysteryDateRow(data);
}

export async function getMysteryGeneratedPlan(generatedDateId: string) {
  return getGeneratedDateById(generatedDateId);
}
