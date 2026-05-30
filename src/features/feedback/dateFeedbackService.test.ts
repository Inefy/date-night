// src/features/feedback/dateFeedbackService.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GeneratedDatePlan } from '@/types/domain';

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  requireSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  requireSupabaseClient: supabaseMocks.requireSupabaseClient,
}));

import { saveDateFeedback } from './dateFeedbackService';

const samplePlan: GeneratedDatePlan = {
  backupPlan: 'Use the backup version.',
  calendarDescription: 'Calendar description.',
  calendarTitle: 'Date Night: Rainy Window',
  conversationPrompt: 'What should feel lighter this week?',
  energy: 'low',
  estimatedBudgetLabel: 'Free',
  estimatedDurationMinutes: 60,
  foodPlan: 'No food required.',
  locationMode: 'at_home',
  premise: 'A quiet rainy-day plan.',
  prepItems: ['Choose a comfortable spot'],
  seed: 'rainy-window:seed',
  shareTeaser: 'A rainy-day card is waiting.',
  sourceTemplateId: 'rainy-window',
  steps: [
    {
      description: 'Start slowly.',
      durationMinutes: 20,
      id: 'step-1',
      sortOrder: 1,
      title: 'Ease in',
    },
  ],
  title: 'Rainy Window',
  twist: 'Leave one small note for later.',
  vibeTags: ['rainy_day', 'low_energy'],
};

describe('saveDateFeedback', () => {
  beforeEach(() => {
    supabaseMocks.insert.mockResolvedValue({ error: null });
    supabaseMocks.from.mockReturnValue({ insert: supabaseMocks.insert });
    supabaseMocks.requireSupabaseClient.mockReturnValue({ from: supabaseMocks.from });
  });

  it('inserts sanitized feedback without trusting local generated IDs as UUIDs', async () => {
    await saveDateFeedback({
      coupleId: 'couple-1',
      generatedDateId: 'local-generated-date',
      notes: '  Too much travel tonight.  ',
      plan: samplePlan,
      rating: 'disliked',
      remixReasons: ['too_far', 'too_much_effort'],
      userId: 'user-1',
    });

    expect(supabaseMocks.from).toHaveBeenCalledWith('date_feedback');
    expect(supabaseMocks.insert).toHaveBeenCalledWith({
      couple_id: 'couple-1',
      generated_date_id: null,
      notes: 'Too much travel tonight.',
      plan_seed: 'rainy-window:seed',
      rating: 'disliked',
      remix_reasons: ['too_far', 'too_much_effort'],
      source_template_id: null,
      source_template_key: 'rainy-window',
      user_id: 'user-1',
    });
  });

  it('keeps persisted generated date and template UUIDs in the insert payload', async () => {
    const generatedDateId = '123e4567-e89b-12d3-a456-426614174000';
    const sourceTemplateId = '223e4567-e89b-12d3-a456-426614174000';

    await saveDateFeedback({
      generatedDateId,
      plan: {
        ...samplePlan,
        sourceTemplateId,
      },
      rating: 'liked',
      userId: 'user-1',
    });

    expect(supabaseMocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        generated_date_id: generatedDateId,
        source_template_id: sourceTemplateId,
        source_template_key: sourceTemplateId,
      }),
    );
  });

  it('maps row-level-security failures to friendly feedback copy', async () => {
    supabaseMocks.insert.mockResolvedValue({
      error: { message: 'new row violates row-level security policy' },
    });

    await expect(
      saveDateFeedback({
        plan: samplePlan,
        rating: 'neutral',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Feedback could not be saved for this couple deck.');
  });
});
