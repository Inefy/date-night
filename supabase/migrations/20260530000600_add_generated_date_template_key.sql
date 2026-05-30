-- supabase/migrations/20260530000600_add_generated_date_template_key.sql
alter table public.generated_dates
  add column if not exists source_template_key text;

create index if not exists generated_dates_source_template_key_idx
  on public.generated_dates (source_template_key);
