// src/features/feedback/dateFeedbackService.ts
import type { RemixReason } from '@/lib/dateGenerator';
import { requireSupabaseClient } from '@/lib/supabase';
import { isUuid } from '@/lib/uuid';
import type { DateFeedbackRating, GeneratedDatePlan } from '@/types/domain';

type SaveDateFeedbackInput = {
  coupleId?: string;
  generatedDateId?: string;
  notes?: string;
  plan: GeneratedDatePlan;
  rating: DateFeedbackRating;
  remixReasons?: RemixReason[];
  userId: string;
};

function sanitizeNotes(notes?: string) {
  const trimmedNotes = notes?.trim();

  return trimmedNotes ? trimmedNotes : undefined;
}

function toFriendlyFeedbackError(error: unknown) {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : '';
  const message = rawMessage.toLowerCase();

  if (message.includes('row-level security') || message.includes('permission denied')) {
    return 'Feedback could not be saved for this couple deck.';
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return 'We could not reach feedback sync. Check your connection and try again.';
  }

  return rawMessage || 'Feedback could not be saved right now.';
}

export async function saveDateFeedback({
  coupleId,
  generatedDateId,
  notes,
  plan,
  rating,
  remixReasons = [],
  userId,
}: SaveDateFeedbackInput): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.from('date_feedback').insert({
    couple_id: coupleId ?? null,
    generated_date_id: isUuid(generatedDateId) ? generatedDateId : null,
    notes: sanitizeNotes(notes) ?? null,
    plan_seed: plan.seed,
    rating,
    remix_reasons: remixReasons,
    source_template_id: isUuid(plan.sourceTemplateId) ? plan.sourceTemplateId : null,
    source_template_key: plan.sourceTemplateId,
    user_id: userId,
  });

  if (error) {
    throw new Error(toFriendlyFeedbackError(error));
  }
}
