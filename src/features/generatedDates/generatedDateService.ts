// src/features/generatedDates/generatedDateService.ts
import type { DateGenerationFilters } from '@/lib/dateGenerator';
import { requireSupabaseClient } from '@/lib/supabase';
import { isUuid } from '@/lib/uuid';
import type { DateStep, GeneratedDatePlan } from '@/types/domain';

export type PersistedGeneratedDate = {
  coupleId?: string;
  createdAt: string;
  id: string;
  plan: GeneratedDatePlan;
  userId: string;
};

type GeneratedDateRow = {
  backup_plan: string;
  calendar_description: string;
  calendar_title: string;
  conversation_prompt: string;
  couple_id?: string | null;
  created_at: string;
  energy: GeneratedDatePlan['energy'];
  estimated_budget_label: string;
  estimated_duration_minutes: number;
  filters?: Record<string, unknown> | null;
  food_plan: string;
  id: string;
  location_mode: GeneratedDatePlan['locationMode'];
  premise: string;
  prep_items: string[];
  seed: string;
  share_teaser: string;
  source_template_id?: string | null;
  source_template_key?: string | null;
  steps: unknown;
  title: string;
  twist: string;
  user_id: string;
  vibe_tags: GeneratedDatePlan['vibeTags'];
};

type RecentGeneratedTemplateRow = {
  filters?: Record<string, unknown> | null;
  seed: string;
  source_template_id?: string | null;
  source_template_key?: string | null;
};

type CreateGeneratedDateInput = {
  coupleId?: string;
  filters: DateGenerationFilters;
  plan: GeneratedDatePlan;
  userId: string;
};

type ListRecentGeneratedDatesOptions = {
  coupleId?: string;
  limit?: number;
};

const GENERATED_DATE_SELECT = [
  'backup_plan',
  'calendar_description',
  'calendar_title',
  'conversation_prompt',
  'couple_id',
  'created_at',
  'energy',
  'estimated_budget_label',
  'estimated_duration_minutes',
  'filters',
  'food_plan',
  'id',
  'location_mode',
  'premise',
  'prep_items',
  'seed',
  'share_teaser',
  'source_template_id',
  'source_template_key',
  'steps',
  'title',
  'twist',
  'user_id',
  'vibe_tags',
].join(', ');

function toFriendlyGeneratedDateError(error: unknown): string {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const message = rawMessage.toLowerCase();

  if (message.includes('permission denied') || message.includes('row-level security')) {
    return 'You do not have access to that generated date.';
  }

  if (message.includes('invalid input syntax') || message.includes('invalid uuid')) {
    return 'That generated date link is not valid.';
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return 'We could not reach the date sync service. Check your connection and try again.';
  }

  return rawMessage || 'The generated date could not be synced.';
}

function normalizeSteps(value: unknown): DateStep[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index): DateStep | undefined => {
      if (!item || typeof item !== 'object') {
        return undefined;
      }

      const candidate = item as Record<string, unknown>;
      const title = typeof candidate.title === 'string' ? candidate.title : undefined;
      const description =
        typeof candidate.description === 'string' ? candidate.description : undefined;

      if (!title || !description) {
        return undefined;
      }

      return {
        description,
        durationMinutes:
          typeof candidate.durationMinutes === 'number' ? candidate.durationMinutes : undefined,
        id: typeof candidate.id === 'string' ? candidate.id : `persisted-step-${index + 1}`,
        locationHint:
          typeof candidate.locationHint === 'string' ? candidate.locationHint : undefined,
        sortOrder: typeof candidate.sortOrder === 'number' ? candidate.sortOrder : index + 1,
        title,
      };
    })
    .filter((step): step is DateStep => Boolean(step));
}

function getSourceTemplateId(row: GeneratedDateRow) {
  return getRecentSourceTemplateId(row);
}

function getRecentSourceTemplateId(row: RecentGeneratedTemplateRow) {
  const filters = row.filters ?? {};
  const filterTemplateId = filters.sourceTemplateId;

  if (typeof row.source_template_key === 'string' && row.source_template_key.length > 0) {
    return row.source_template_key;
  }

  if (typeof filterTemplateId === 'string' && filterTemplateId.length > 0) {
    return filterTemplateId;
  }

  return row.source_template_id ?? row.seed;
}

function rowToGeneratedDate(row: GeneratedDateRow): PersistedGeneratedDate {
  return {
    coupleId: row.couple_id ?? undefined,
    createdAt: row.created_at,
    id: row.id,
    plan: {
      backupPlan: row.backup_plan,
      calendarDescription: row.calendar_description,
      calendarTitle: row.calendar_title,
      conversationPrompt: row.conversation_prompt,
      energy: row.energy,
      estimatedBudgetLabel: row.estimated_budget_label,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      foodPlan: row.food_plan,
      locationMode: row.location_mode,
      premise: row.premise,
      prepItems: row.prep_items,
      seed: row.seed,
      shareTeaser: row.share_teaser,
      sourceTemplateId: getSourceTemplateId(row),
      steps: normalizeSteps(row.steps),
      title: row.title,
      twist: row.twist,
      vibeTags: row.vibe_tags,
    },
    userId: row.user_id,
  };
}

function planToInsert(input: CreateGeneratedDateInput) {
  const { coupleId, filters, plan, userId } = input;

  return {
    backup_plan: plan.backupPlan,
    calendar_description: plan.calendarDescription,
    calendar_title: plan.calendarTitle,
    conversation_prompt: plan.conversationPrompt,
    couple_id: coupleId ?? null,
    energy: plan.energy,
    estimated_budget_label: plan.estimatedBudgetLabel,
    estimated_duration_minutes: plan.estimatedDurationMinutes,
    filters: {
      ...filters,
      sourceTemplateId: plan.sourceTemplateId,
    },
    food_plan: plan.foodPlan,
    location_mode: plan.locationMode,
    premise: plan.premise,
    prep_items: plan.prepItems,
    seed: plan.seed,
    share_teaser: plan.shareTeaser,
    source_template_key: plan.sourceTemplateId,
    steps: plan.steps,
    title: plan.title,
    twist: plan.twist,
    user_id: userId,
    vibe_tags: plan.vibeTags,
  };
}

export function isPersistedGeneratedDateId(value: string) {
  return isUuid(value);
}

export async function createGeneratedDate(
  input: CreateGeneratedDateInput,
): Promise<PersistedGeneratedDate> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('generated_dates')
    .insert(planToInsert(input))
    .select(GENERATED_DATE_SELECT)
    .single<GeneratedDateRow>();

  if (error) {
    throw new Error(toFriendlyGeneratedDateError(error));
  }

  return rowToGeneratedDate(data);
}

export async function getGeneratedDateById(
  id: string,
): Promise<PersistedGeneratedDate | undefined> {
  if (!isPersistedGeneratedDateId(id)) {
    return undefined;
  }

  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('generated_dates')
    .select(GENERATED_DATE_SELECT)
    .eq('id', id)
    .maybeSingle<GeneratedDateRow>();

  if (error) {
    throw new Error(toFriendlyGeneratedDateError(error));
  }

  return data ? rowToGeneratedDate(data) : undefined;
}

export async function listRecentGeneratedDates({
  coupleId,
  limit = 10,
}: ListRecentGeneratedDatesOptions = {}): Promise<PersistedGeneratedDate[]> {
  const client = requireSupabaseClient();
  let query = client
    .from('generated_dates')
    .select(GENERATED_DATE_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (coupleId) {
    query = query.eq('couple_id', coupleId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(toFriendlyGeneratedDateError(error));
  }

  return ((data ?? []) as unknown as GeneratedDateRow[]).map(rowToGeneratedDate);
}

export async function listRecentGeneratedTemplateIds({
  coupleId,
  limit = 10,
}: ListRecentGeneratedDatesOptions = {}): Promise<string[]> {
  const client = requireSupabaseClient();
  let query = client
    .from('generated_dates')
    .select('filters, seed, source_template_id, source_template_key')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (coupleId) {
    query = query.eq('couple_id', coupleId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(toFriendlyGeneratedDateError(error));
  }

  return ((data ?? []) as unknown as RecentGeneratedTemplateRow[]).map(getRecentSourceTemplateId);
}

export async function listGeneratedDatesByIds(ids: string[]): Promise<PersistedGeneratedDate[]> {
  const validIds = Array.from(new Set(ids.filter(isPersistedGeneratedDateId)));

  if (validIds.length === 0) {
    return [];
  }

  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('generated_dates')
    .select(GENERATED_DATE_SELECT)
    .in('id', validIds);

  if (error) {
    throw new Error(toFriendlyGeneratedDateError(error));
  }

  return ((data ?? []) as unknown as GeneratedDateRow[]).map(rowToGeneratedDate);
}
