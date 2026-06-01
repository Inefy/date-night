// src/features/calendar/calendarService.ts
import * as Calendar from 'expo-calendar';
import * as Clipboard from 'expo-clipboard';
import { Platform } from 'react-native';

import { formatOptionalDuration } from '@/lib/formatters';
import { requireSupabaseClient } from '@/lib/supabase';
import type { DateStep, GeneratedDatePlan } from '@/types/domain';

export type CalendarScheduleInput = {
  durationMinutes: number;
  startAt: Date;
  title: string;
};

export type CreatedCalendarEvent = {
  calendarId: string;
  endAt: Date;
  eventId: string;
  notes: string;
  provider: 'device';
  startAt: Date;
  title: string;
};

export type CalendarCreateResult =
  | {
      event: CreatedCalendarEvent;
      status: 'created';
    }
  | {
      reason: 'permission_denied' | 'unavailable';
      status: 'blocked';
    };

type SaveCalendarEventMetadataInput = {
  calendarId: string;
  coupleId?: string;
  description: string;
  endsAt: Date;
  eventId: string;
  generatedDateId: string;
  provider: CreatedCalendarEvent['provider'];
  startsAt: Date;
  title: string;
  userId: string;
};

function formatStep(step: DateStep) {
  const duration = formatOptionalDuration(step.durationMinutes);
  const suffix = duration ? ` (${duration})` : '';

  return `${step.sortOrder}. ${step.title}${suffix}\n${step.description}`;
}

export function buildCalendarEventNotes(plan: GeneratedDatePlan) {
  return [
    plan.premise,
    '',
    'Itinerary',
    ...plan.steps.map(formatStep),
    '',
    'Prep list',
    ...plan.prepItems.map((item) => `- ${item}`),
    '',
    'Food plan',
    plan.foodPlan,
    '',
    'Twist',
    plan.twist,
    '',
    'Backup plan',
    plan.backupPlan,
  ].join('\n');
}

export function buildCopyablePlan(plan: GeneratedDatePlan) {
  return [plan.calendarTitle, '', buildCalendarEventNotes(plan)].join('\n');
}

function toFriendlyCalendarError(error: unknown) {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const message = rawMessage.toLowerCase();

  if (message.includes('permission') || message.includes('not authorized')) {
    return 'Calendar permission was not granted.';
  }

  if (message.includes('not available') || message.includes('unavailability')) {
    return 'Device calendar is not available here.';
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return 'The calendar event was created, but sync metadata could not be saved.';
  }

  return rawMessage || 'Calendar could not be updated right now.';
}

async function requestWritableCalendarPermission(): Promise<CalendarCreateResult | undefined> {
  const permission = await Calendar.requestCalendarPermissions();

  if (!permission.granted) {
    return {
      reason: Platform.OS === 'web' ? 'unavailable' : 'permission_denied',
      status: 'blocked',
    };
  }

  return undefined;
}

async function getWritableCalendar() {
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const modifiableCalendars = calendars.filter((calendar) => calendar.allowsModifications);
  const primaryCalendar = modifiableCalendars.find((calendar) => calendar.isPrimary);

  return primaryCalendar ?? modifiableCalendars[0];
}

export async function createDateNightCalendarEvent(
  plan: GeneratedDatePlan,
  schedule: CalendarScheduleInput,
): Promise<CalendarCreateResult> {
  try {
    const blocked = await requestWritableCalendarPermission();

    if (blocked) {
      return blocked;
    }

    const calendar = await getWritableCalendar();

    if (!calendar) {
      return {
        reason: 'unavailable',
        status: 'blocked',
      };
    }

    const startAt = schedule.startAt;
    const endAt = new Date(startAt.getTime() + schedule.durationMinutes * 60_000);
    const notes = buildCalendarEventNotes(plan);
    const event = await calendar.createEvent({
      endDate: endAt,
      notes,
      startDate: startAt,
      title: schedule.title,
    });

    return {
      event: {
        calendarId: calendar.id,
        endAt,
        eventId: event.id,
        notes,
        provider: 'device',
        startAt,
        title: schedule.title,
      },
      status: 'created',
    };
  } catch (error) {
    const friendlyMessage = toFriendlyCalendarError(error);

    if (friendlyMessage.includes('permission')) {
      return {
        reason: 'permission_denied',
        status: 'blocked',
      };
    }

    if (friendlyMessage.includes('not available')) {
      return {
        reason: 'unavailable',
        status: 'blocked',
      };
    }

    throw new Error(friendlyMessage);
  }
}

export async function copyPlanToClipboard(plan: GeneratedDatePlan) {
  await Clipboard.setStringAsync(buildCopyablePlan(plan));
}

export async function saveCalendarEventMetadata({
  calendarId,
  coupleId,
  description,
  endsAt,
  eventId,
  generatedDateId,
  provider,
  startsAt,
  title,
  userId,
}: SaveCalendarEventMetadataInput): Promise<void> {
  const client = requireSupabaseClient();
  const { error } = await client.from('calendar_events').insert({
    couple_id: coupleId ?? null,
    description,
    ends_at: endsAt.toISOString(),
    external_event_id: eventId,
    generated_date_id: generatedDateId,
    provider,
    starts_at: startsAt.toISOString(),
    title,
    user_id: userId,
  });

  if (error) {
    throw new Error(toFriendlyCalendarError(error));
  }
}
