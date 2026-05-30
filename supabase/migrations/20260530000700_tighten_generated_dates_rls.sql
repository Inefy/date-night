-- supabase/migrations/20260530000700_tighten_generated_dates_rls.sql
drop policy if exists generated_dates_members_read on public.generated_dates;

create policy generated_dates_members_read
on public.generated_dates
for select
to authenticated
using (
  (couple_id is null and user_id = auth.uid())
  or (couple_id is not null and public.is_active_couple_member(couple_id))
);
