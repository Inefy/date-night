-- supabase/migrations/20260530001100_update_analytics_events.sql
alter table public.analytics_events
  drop constraint if exists analytics_events_name_check;

alter table public.analytics_events
  add constraint analytics_events_name_check check (
    event_name in (
      'app_opened',
      'calendar_add_completed',
      'calendar_add_failed',
      'calendar_add_started',
      'date_generated',
      'date_remixed',
      'date_saved',
      'date_unsaved',
      'date_viewed',
      'feedback_submitted',
      'invite_accepted',
      'invite_created',
      'mystery_created',
      'mystery_opened',
      'mystery_revealed',
      'mystery_shared',
      'onboarding_completed',
      'calendar_event_created'
    )
  );

drop policy if exists analytics_events_insert_own on public.analytics_events;
drop policy if exists analytics_events_insert_client on public.analytics_events;

create policy analytics_events_insert_client
on public.analytics_events
for insert
to anon, authenticated
with check (
  (
    auth.uid() is null
    and user_id is null
    and couple_id is null
  )
  or (
    auth.uid() is not null
    and (user_id is null or user_id = auth.uid())
    and (couple_id is null or public.is_active_couple_member(couple_id))
  )
);

grant insert on table public.analytics_events to anon, authenticated;
