-- supabase/migrations/20260530000300_allow_profile_bootstrap.sql
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

grant insert (
  id,
  display_name,
  email,
  avatar_url,
  timezone,
  preferred_budget,
  preferred_energy,
  preferred_location_mode
) on table public.profiles to authenticated;
