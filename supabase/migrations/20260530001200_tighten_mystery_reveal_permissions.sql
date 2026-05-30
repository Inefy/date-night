-- Keep mystery reveal state behind public.reveal_mystery_date().
revoke update (revealed_at) on table public.mystery_dates from authenticated;
