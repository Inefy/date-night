// src/features/analytics/analyticsService.ts
import { supabase } from '@/lib/supabase';
import { isUuid } from '@/lib/uuid';
import type { GeneratedDatePlan } from '@/types/domain';

export type AnalyticsEventName =
  | 'app_opened'
  | 'calendar_add_completed'
  | 'calendar_add_failed'
  | 'calendar_add_started'
  | 'date_generated'
  | 'date_remixed'
  | 'date_saved'
  | 'date_unsaved'
  | 'invite_accepted'
  | 'invite_created'
  | 'mystery_created'
  | 'mystery_opened'
  | 'mystery_revealed'
  | 'mystery_shared'
  | 'onboarding_completed';

type AnalyticsPropertyValue = boolean | number | string | null | string[];

type AnalyticsProperties = Record<string, AnalyticsPropertyValue | undefined>;

type TrackAnalyticsEventInput = {
  coupleId?: string;
  eventName: AnalyticsEventName;
  generatedDateId?: string;
  properties?: AnalyticsProperties;
  userId?: string;
};

type TrackDatePlanEventInput = Omit<TrackAnalyticsEventInput, 'properties'> & {
  plan?: GeneratedDatePlan;
  properties?: AnalyticsProperties;
  remixReason?: string;
  source?: string;
};

const allowedPropertyKeys = new Set([
  'budget_tier',
  'duration_bucket',
  'energy',
  'failure_reason',
  'has_couple',
  'partner_pending',
  'remix_reason',
  'reveal_style',
  'source',
  'status',
  'vibe',
]);

function budgetTierFromLabel(label: string) {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes('free')) {
    return 'free';
  }

  if (normalizedLabel.includes('low')) {
    return 'low';
  }

  if (normalizedLabel.includes('moderate')) {
    return 'moderate';
  }

  if (normalizedLabel.includes('splurge')) {
    return 'splurge';
  }

  if (normalizedLabel.includes('higher') || normalizedLabel.includes('high')) {
    return 'high';
  }

  return 'unknown';
}

function durationBucket(minutes: number) {
  if (minutes <= 60) {
    return 'under_1h';
  }

  if (minutes <= 120) {
    return '1_2h';
  }

  if (minutes <= 180) {
    return '2_3h';
  }

  return '3h_plus';
}

function sanitizeProperties(properties: AnalyticsProperties = {}) {
  return Object.fromEntries(
    Object.entries(properties)
      .filter(([key, value]) => allowedPropertyKeys.has(key) && value !== undefined)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return [key, value.slice(0, 8).filter((item) => item.length <= 80)];
        }

        if (typeof value === 'string') {
          return [key, value.slice(0, 80)];
        }

        return [key, value];
      }),
  );
}

export function getDatePlanAnalyticsProperties(plan: GeneratedDatePlan): AnalyticsProperties {
  return {
    budget_tier: budgetTierFromLabel(plan.estimatedBudgetLabel),
    duration_bucket: durationBucket(plan.estimatedDurationMinutes),
    energy: plan.energy,
    vibe: plan.vibeTags[0] ?? 'unknown',
  };
}

export function trackAnalyticsEvent(input: TrackAnalyticsEventInput) {
  void trackAnalyticsEventAsync(input);
}

export function trackDatePlanAnalyticsEvent({
  plan,
  properties,
  remixReason,
  source,
  ...input
}: TrackDatePlanEventInput) {
  trackAnalyticsEvent({
    ...input,
    properties: {
      ...(plan ? getDatePlanAnalyticsProperties(plan) : {}),
      ...properties,
      remix_reason: remixReason,
      source,
    },
  });
}

async function trackAnalyticsEventAsync({
  coupleId,
  eventName,
  generatedDateId,
  properties,
  userId,
}: TrackAnalyticsEventInput) {
  if (!supabase) {
    return;
  }

  const hasUserId = isUuid(userId);

  try {
    await supabase.from('analytics_events').insert({
      couple_id: hasUserId && isUuid(coupleId) ? coupleId : null,
      event_name: eventName,
      event_properties: sanitizeProperties(properties),
      generated_date_id: hasUserId && isUuid(generatedDateId) ? generatedDateId : null,
      user_id: hasUserId ? userId : null,
    });
  } catch {
    // Analytics should never interrupt the user-facing flow.
  }
}
