// src/features/favorites/favoritesService.ts
import { getCurrentActiveMembership } from '@/features/couple/coupleService';
import {
  createGeneratedDate,
  getGeneratedDateById,
  isPersistedGeneratedDateId,
} from '@/features/generatedDates/generatedDateService';
import { requireSupabaseClient } from '@/lib/supabase';
import { saveGeneratedDatePlan } from '@/lib/generatedDateStore';
import type { GeneratedDatePlan } from '@/types/domain';

export type FavoriteDateItem = {
  coupleId?: string;
  favoriteId: string;
  favoritedAt: string;
  generatedDateId: string;
  note?: string;
  plan: GeneratedDatePlan;
  userId: string;
};

type FavoriteDateRow = {
  couple_id?: string | null;
  favorited_at: string;
  generated_date_id?: string | null;
  id: string;
  note?: string | null;
  user_id: string;
};

type FavoriteLookupInput = {
  generatedDateId?: string;
  userId: string;
};

type SaveFavoriteInput = {
  generatedDateId?: string;
  note?: string;
  plan: GeneratedDatePlan;
  userId: string;
};

type ListFavoritesInput = {
  limit?: number;
  userId: string;
};

function toFriendlyFavoriteError(error: unknown): string {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const message = rawMessage.toLowerCase();

  if (message.includes('row-level security') || message.includes('permission denied')) {
    return 'You do not have access to that favorite.';
  }

  if (message.includes('invalid input syntax') || message.includes('invalid uuid')) {
    return 'That saved date link is not valid.';
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return 'We could not reach your saved dates. Check your connection and try again.';
  }

  return rawMessage || 'Favorites could not be updated right now.';
}

function sanitizeNote(note?: string) {
  const trimmedNote = note?.trim();

  return trimmedNote ? trimmedNote : undefined;
}

function mapFavoriteRow(row: FavoriteDateRow, plan: GeneratedDatePlan): FavoriteDateItem {
  if (!row.generated_date_id) {
    throw new Error('Favorite is missing its generated date.');
  }

  return {
    coupleId: row.couple_id ?? undefined,
    favoriteId: row.id,
    favoritedAt: row.favorited_at,
    generatedDateId: row.generated_date_id,
    note: row.note ?? undefined,
    plan,
    userId: row.user_id,
  };
}

async function getFavoriteRow({
  generatedDateId,
  userId,
}: FavoriteLookupInput): Promise<FavoriteDateRow | undefined> {
  if (!generatedDateId || !isPersistedGeneratedDateId(generatedDateId)) {
    return undefined;
  }

  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('favorite_dates')
    .select('couple_id, favorited_at, generated_date_id, id, note, user_id')
    .eq('user_id', userId)
    .eq('generated_date_id', generatedDateId)
    .maybeSingle<FavoriteDateRow>();

  if (error) {
    throw new Error(toFriendlyFavoriteError(error));
  }

  return data ?? undefined;
}

async function resolvePersistedGeneratedDate({
  generatedDateId,
  plan,
  userId,
}: SaveFavoriteInput) {
  if (generatedDateId && isPersistedGeneratedDateId(generatedDateId)) {
    const persistedDate = await getGeneratedDateById(generatedDateId);

    if (!persistedDate) {
      throw new Error('That generated date was not found, or your account cannot access it.');
    }

    return persistedDate;
  }

  const membership = await getCurrentActiveMembership(userId);
  const persistedDate = await createGeneratedDate({
    coupleId: membership?.couple_id,
    filters: {},
    plan,
    userId,
  });

  saveGeneratedDatePlan(persistedDate.plan, persistedDate.id);

  return persistedDate;
}

export async function saveFavorite(input: SaveFavoriteInput): Promise<FavoriteDateItem> {
  const client = requireSupabaseClient();
  const persistedDate = await resolvePersistedGeneratedDate(input);
  const existingFavorite = await getFavoriteRow({
    generatedDateId: persistedDate.id,
    userId: input.userId,
  });

  if (existingFavorite) {
    return mapFavoriteRow(existingFavorite, persistedDate.plan);
  }

  const { data, error } = await client
    .from('favorite_dates')
    .insert({
      couple_id: persistedDate.coupleId ?? null,
      generated_date_id: persistedDate.id,
      note: sanitizeNote(input.note) ?? null,
      user_id: input.userId,
    })
    .select('couple_id, favorited_at, generated_date_id, id, note, user_id')
    .single<FavoriteDateRow>();

  if (error) {
    if (error.code === '23505') {
      const duplicateFavorite = await getFavoriteRow({
        generatedDateId: persistedDate.id,
        userId: input.userId,
      });

      if (duplicateFavorite) {
        return mapFavoriteRow(duplicateFavorite, persistedDate.plan);
      }
    }

    throw new Error(toFriendlyFavoriteError(error));
  }

  return mapFavoriteRow(data, persistedDate.plan);
}

export async function removeFavorite({
  generatedDateId,
  userId,
}: FavoriteLookupInput): Promise<void> {
  if (!generatedDateId || !isPersistedGeneratedDateId(generatedDateId)) {
    return;
  }

  const client = requireSupabaseClient();
  const { error } = await client
    .from('favorite_dates')
    .delete()
    .eq('user_id', userId)
    .eq('generated_date_id', generatedDateId);

  if (error) {
    throw new Error(toFriendlyFavoriteError(error));
  }
}

export async function listFavorites({
  limit = 30,
  userId,
}: ListFavoritesInput): Promise<FavoriteDateItem[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('favorite_dates')
    .select('couple_id, favorited_at, generated_date_id, id, note, user_id')
    .eq('user_id', userId)
    .not('generated_date_id', 'is', null)
    .order('favorited_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(toFriendlyFavoriteError(error));
  }

  const rows = (data ?? []) as FavoriteDateRow[];
  const favorites = await Promise.all(
    rows.map(async (row) => {
      if (!row.generated_date_id) {
        return undefined;
      }

      try {
        const persistedDate = await getGeneratedDateById(row.generated_date_id);

        return persistedDate ? mapFavoriteRow(row, persistedDate.plan) : undefined;
      } catch {
        return undefined;
      }
    }),
  );

  return favorites.filter((favorite): favorite is FavoriteDateItem => Boolean(favorite));
}

export async function isFavorite({
  generatedDateId,
  userId,
}: FavoriteLookupInput): Promise<boolean> {
  const favorite = await getFavoriteRow({ generatedDateId, userId });

  return Boolean(favorite);
}
