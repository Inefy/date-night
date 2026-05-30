-- supabase/migrations/20260530000500_enforce_single_active_couple.sql
create unique index if not exists couple_members_one_active_couple_per_user_idx
  on public.couple_members (user_id)
  where is_active = true and left_at is null;
