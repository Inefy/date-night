-- supabase/migrations/20260530001000_add_remix_feedback_reasons.sql
alter table public.date_feedback
  add column if not exists remix_reasons text[] not null default '{}',
  add column if not exists source_template_key text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'date_feedback_remix_reasons_check'
      and conrelid = 'public.date_feedback'::regclass
  ) then
    alter table public.date_feedback
      add constraint date_feedback_remix_reasons_check check (
        remix_reasons <@ array[
          'too_expensive',
          'too_far',
          'too_social',
          'too_quiet',
          'too_much_effort',
          'too_food_focused',
          'bad_weather',
          'not_our_vibe',
          'surprise_me_again'
        ]
      );
  end if;
end;
$$;

create index if not exists date_feedback_source_template_key_idx
  on public.date_feedback (source_template_key);
