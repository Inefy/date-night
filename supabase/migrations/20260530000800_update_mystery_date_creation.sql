-- supabase/migrations/20260530000800_update_mystery_date_creation.sql
alter table public.mystery_dates
  drop constraint if exists mystery_dates_reveal_style_check;

alter table public.mystery_dates
  add constraint mystery_dates_reveal_style_check
  check (reveal_style in ('deck_flip', 'sealed_envelope', 'scratch_card'));

drop function if exists public.create_mystery_date(uuid, text, text, timestamptz, timestamptz);

create or replace function public.create_mystery_date(
  p_generated_date_id uuid default null,
  p_couple_id uuid default null,
  p_plan jsonb default null,
  p_filters jsonb default '{}'::jsonb,
  p_reveal_style text default 'deck_flip',
  p_teaser text default null,
  p_creator_message text default null,
  p_reveal_at timestamptz default null,
  p_expires_at timestamptz default null,
  p_create_invite boolean default false
)
returns table (
  mystery_date_id uuid,
  generated_date_id uuid,
  token text,
  invite_token text,
  invite_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  generated_record public.generated_dates%rowtype;
  created_mystery_date_id uuid;
  created_token text;
  resolved_couple_id uuid;
  resolved_teaser text;
  selected_invite public.couple_invites%rowtype;
  created_invite_id uuid;
  created_invite_token text;
  created_invite_expires_at timestamptz;
begin
  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_reveal_style not in ('deck_flip', 'sealed_envelope', 'scratch_card') then
    raise exception 'Invalid reveal style.';
  end if;

  if p_generated_date_id is not null then
    select *
    into generated_record
    from public.generated_dates
    where id = p_generated_date_id;
  end if;

  resolved_couple_id := coalesce(generated_record.couple_id, p_couple_id);

  if resolved_couple_id is null then
    raise exception 'Mystery dates require a couple.';
  end if;

  if not public.is_active_couple_member(resolved_couple_id) then
    raise exception 'Only active couple members can create mystery dates.';
  end if;

  if generated_record.id is null
    or generated_record.couple_id is distinct from resolved_couple_id then
    if p_plan is null then
      raise exception 'Generated date not found.';
    end if;

    insert into public.generated_dates (
      user_id,
      couple_id,
      seed,
      title,
      premise,
      vibe_tags,
      estimated_budget_label,
      estimated_duration_minutes,
      energy,
      location_mode,
      food_plan,
      steps,
      prep_items,
      twist,
      conversation_prompt,
      backup_plan,
      calendar_title,
      calendar_description,
      share_teaser,
      filters,
      source_template_key
    )
    values (
      actor_id,
      resolved_couple_id,
      coalesce(nullif(p_plan ->> 'seed', ''), gen_random_uuid()::text),
      coalesce(nullif(p_plan ->> 'title', ''), 'Mystery Date'),
      coalesce(nullif(p_plan ->> 'premise', ''), 'A locked Date Night Deck plan.'),
      (
        select coalesce(array_agg(vibe.value), array[]::text[])
        from jsonb_array_elements_text(
          case
            when jsonb_typeof(p_plan -> 'vibeTags') = 'array' then p_plan -> 'vibeTags'
            else '[]'::jsonb
          end
        ) as vibe(value)
      ),
      coalesce(nullif(p_plan ->> 'estimatedBudgetLabel', ''), 'Budget flexible'),
      coalesce((p_plan ->> 'estimatedDurationMinutes')::integer, 90),
      coalesce(nullif(p_plan ->> 'energy', ''), 'medium'),
      coalesce(nullif(p_plan ->> 'locationMode', ''), 'hybrid'),
      coalesce(nullif(p_plan ->> 'foodPlan', ''), 'Food plan flexible.'),
      case
        when jsonb_typeof(p_plan -> 'steps') = 'array' then p_plan -> 'steps'
        else '[]'::jsonb
      end,
      (
        select coalesce(array_agg(prep.value), array[]::text[])
        from jsonb_array_elements_text(
          case
            when jsonb_typeof(p_plan -> 'prepItems') = 'array' then p_plan -> 'prepItems'
            else '[]'::jsonb
          end
        ) as prep(value)
      ),
      coalesce(nullif(p_plan ->> 'twist', ''), 'Keep one small surprise until the last step.'),
      coalesce(nullif(p_plan ->> 'conversationPrompt', ''), 'What should we make feel special tonight?'),
      coalesce(nullif(p_plan ->> 'backupPlan', ''), 'Keep the date simple and move it indoors.'),
      coalesce(nullif(p_plan ->> 'calendarTitle', ''), nullif(p_plan ->> 'title', ''), 'Mystery Date'),
      coalesce(nullif(p_plan ->> 'calendarDescription', ''), nullif(p_plan ->> 'premise', ''), 'A locked Date Night Deck plan.'),
      coalesce(nullif(p_plan ->> 'shareTeaser', ''), 'A mystery date is waiting.'),
      case
        when jsonb_typeof(coalesce(p_filters, '{}'::jsonb)) = 'object' then
          coalesce(p_filters, '{}'::jsonb) || jsonb_build_object('sourceTemplateId', p_plan ->> 'sourceTemplateId')
        else
          jsonb_build_object('sourceTemplateId', p_plan ->> 'sourceTemplateId')
      end,
      nullif(p_plan ->> 'sourceTemplateId', '')
    )
    returning * into generated_record;
  end if;

  if generated_record.couple_id is null then
    raise exception 'Mystery dates require a couple.';
  end if;

  if not public.is_active_couple_member(generated_record.couple_id) then
    raise exception 'Only active couple members can create mystery dates.';
  end if;

  resolved_teaser := coalesce(
    nullif(p_creator_message, ''),
    nullif(p_teaser, ''),
    nullif(generated_record.share_teaser, ''),
    'A mystery date is waiting.'
  );

  created_token := public.generate_unique_mystery_date_token();

  insert into public.mystery_dates (
    generated_date_id,
    couple_id,
    created_by,
    token,
    reveal_style,
    teaser,
    reveal_at,
    expires_at
  )
  values (
    generated_record.id,
    generated_record.couple_id,
    actor_id,
    created_token,
    p_reveal_style,
    resolved_teaser,
    p_reveal_at,
    p_expires_at
  )
  returning id into created_mystery_date_id;

  if p_create_invite then
    select *
    into selected_invite
    from public.couple_invites
    where couple_id = generated_record.couple_id
      and accepted_at is null
      and revoked_at is null
      and (expires_at is null or expires_at > now())
    order by created_at desc
    limit 1;

    if selected_invite.id is not null then
      created_invite_token := selected_invite.token;
      created_invite_expires_at := selected_invite.expires_at;
    else
      created_invite_token := public.generate_unique_couple_invite_token();
      created_invite_expires_at := now() + interval '7 days';

      insert into public.couple_invites (
        couple_id,
        created_by,
        token,
        expires_at
      )
      values (
        generated_record.couple_id,
        actor_id,
        created_invite_token,
        created_invite_expires_at
      )
      returning id into created_invite_id;
    end if;
  end if;

  return query
  select
    created_mystery_date_id,
    generated_record.id,
    created_token,
    created_invite_token,
    created_invite_expires_at;
end;
$$;

revoke all on function public.create_mystery_date(
  uuid,
  uuid,
  jsonb,
  jsonb,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean
) from public;

grant execute on function public.create_mystery_date(
  uuid,
  uuid,
  jsonb,
  jsonb,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean
) to authenticated;
