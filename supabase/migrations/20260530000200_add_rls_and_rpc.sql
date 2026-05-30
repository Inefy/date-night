-- supabase/migrations/20260530000200_add_rls_and_rpc.sql
alter table public.couple_members
  add column if not exists is_active boolean not null default true,
  add column if not exists left_at timestamptz,
  add constraint couple_members_active_left_at_check check (
    (is_active = true and left_at is null) or is_active = false
  );

create index if not exists couple_members_active_couple_id_idx
  on public.couple_members (couple_id)
  where is_active = true and left_at is null;

create index if not exists couple_members_active_user_id_idx
  on public.couple_members (user_id)
  where is_active = true and left_at is null;

create or replace function public.is_active_couple_member(target_couple_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.couple_members cm
    where cm.couple_id = target_couple_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
      and cm.left_at is null
  );
$$;

create or replace function public.enforce_max_active_couple_members()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  active_member_count integer;
begin
  if new.is_active = true then
    new.left_at = null;

    select count(*)
    into active_member_count
    from public.couple_members cm
    where cm.couple_id = new.couple_id
      and cm.is_active = true
      and cm.left_at is null
      and cm.id <> new.id;

    if active_member_count >= 2 then
      raise exception 'A couple can have at most two active members.';
    end if;
  elsif tg_op = 'UPDATE' and old.is_active = true and new.left_at is null then
    new.left_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists couple_members_enforce_max_active on public.couple_members;
create trigger couple_members_enforce_max_active
before insert or update of couple_id, is_active, left_at
on public.couple_members
for each row execute function public.enforce_max_active_couple_members();

create or replace function public.prevent_unsafe_mystery_date_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.id is distinct from new.id
    or old.generated_date_id is distinct from new.generated_date_id
    or old.couple_id is distinct from new.couple_id
    or old.created_by is distinct from new.created_by
    or old.token is distinct from new.token
    or old.reveal_style is distinct from new.reveal_style
    or old.created_at is distinct from new.created_at then
    raise exception 'Only teaser and reveal timing fields can be updated on mystery dates.';
  end if;

  return new;
end;
$$;

drop trigger if exists mystery_dates_guard_update on public.mystery_dates;
create trigger mystery_dates_guard_update
before update on public.mystery_dates
for each row execute function public.prevent_unsafe_mystery_date_update();

create or replace function public.generate_high_entropy_token()
returns text
language sql
volatile
set search_path = public, pg_temp
as $$
  select translate(rtrim(encode(gen_random_bytes(32), 'base64'), '='), '+/', '-_');
$$;

create or replace function public.generate_unique_couple_invite_token()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  generated_token text;
begin
  loop
    generated_token := public.generate_high_entropy_token();
    exit when not exists (
      select 1 from public.couple_invites where token = generated_token
    );
  end loop;

  return generated_token;
end;
$$;

create or replace function public.generate_unique_mystery_date_token()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  generated_token text;
begin
  loop
    generated_token := public.generate_high_entropy_token();
    exit when not exists (
      select 1 from public.mystery_dates where token = generated_token
    );
  end loop;

  return generated_token;
end;
$$;

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.couple_invites enable row level security;
alter table public.date_templates enable row level security;
alter table public.generated_dates enable row level security;
alter table public.mystery_dates enable row level security;
alter table public.favorite_dates enable row level security;
alter table public.date_feedback enable row level security;
alter table public.calendar_events enable row level security;
alter table public.analytics_events enable row level security;

create policy profiles_read_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy couples_active_members_read
on public.couples
for select
to authenticated
using (public.is_active_couple_member(id));

create policy couples_active_members_update
on public.couples
for update
to authenticated
using (public.is_active_couple_member(id))
with check (public.is_active_couple_member(id));

create policy couple_members_active_members_read
on public.couple_members
for select
to authenticated
using (public.is_active_couple_member(couple_id));

create policy couple_invites_active_members_read
on public.couple_invites
for select
to authenticated
using (public.is_active_couple_member(couple_id));

create policy date_templates_authenticated_read_active
on public.date_templates
for select
to authenticated
using (is_active = true);

create policy generated_dates_members_read
on public.generated_dates
for select
to authenticated
using (
  user_id = auth.uid()
  or (couple_id is not null and public.is_active_couple_member(couple_id))
);

create policy generated_dates_members_insert
on public.generated_dates
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (couple_id is null or public.is_active_couple_member(couple_id))
);

create policy mystery_dates_members_read
on public.mystery_dates
for select
to authenticated
using (public.is_active_couple_member(couple_id));

create policy mystery_dates_members_update_allowed_fields
on public.mystery_dates
for update
to authenticated
using (public.is_active_couple_member(couple_id))
with check (public.is_active_couple_member(couple_id));

create policy favorite_dates_members_read
on public.favorite_dates
for select
to authenticated
using (
  user_id = auth.uid()
  or (couple_id is not null and public.is_active_couple_member(couple_id))
);

create policy favorite_dates_members_insert
on public.favorite_dates
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (couple_id is null or public.is_active_couple_member(couple_id))
);

create policy favorite_dates_members_delete
on public.favorite_dates
for delete
to authenticated
using (
  user_id = auth.uid()
  or (couple_id is not null and public.is_active_couple_member(couple_id))
);

create policy date_feedback_members_read
on public.date_feedback
for select
to authenticated
using (
  user_id = auth.uid()
  or (couple_id is not null and public.is_active_couple_member(couple_id))
);

create policy date_feedback_members_insert
on public.date_feedback
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (couple_id is null or public.is_active_couple_member(couple_id))
);

create policy calendar_events_manage_own
on public.calendar_events
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy analytics_events_insert_own
on public.analytics_events
for insert
to authenticated
with check (user_id = auth.uid());

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.couples from anon, authenticated;
revoke all on table public.couple_members from anon, authenticated;
revoke all on table public.couple_invites from anon, authenticated;
revoke all on table public.date_templates from anon, authenticated;
revoke all on table public.generated_dates from anon, authenticated;
revoke all on table public.mystery_dates from anon, authenticated;
revoke all on table public.favorite_dates from anon, authenticated;
revoke all on table public.date_feedback from anon, authenticated;
revoke all on table public.calendar_events from anon, authenticated;
revoke all on table public.analytics_events from anon, authenticated;

grant usage on schema public to authenticated;
grant select on table public.date_templates to authenticated;
grant select on table public.couple_members to authenticated;
grant select on table public.couple_invites to authenticated;
grant select, insert on table public.generated_dates to authenticated;
grant select, insert, delete on table public.favorite_dates to authenticated;
grant select, insert on table public.date_feedback to authenticated;
grant select, insert, update, delete on table public.calendar_events to authenticated;
grant insert on table public.analytics_events to authenticated;
grant select on table public.profiles to authenticated;
grant update (
  display_name,
  email,
  avatar_url,
  timezone,
  preferred_budget,
  preferred_energy,
  preferred_location_mode
) on table public.profiles to authenticated;
grant select on table public.couples to authenticated;
grant update (name) on table public.couples to authenticated;
grant select on table public.mystery_dates to authenticated;
grant update (
  teaser,
  reveal_at,
  revealed_at,
  expires_at
) on table public.mystery_dates to authenticated;

create or replace function public.create_couple_with_member(
  p_name text default null,
  p_display_name text default null
)
returns table (couple_id uuid, member_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  created_couple_id uuid;
  created_member_id uuid;
  resolved_display_name text;
begin
  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  select coalesce(nullif(p_display_name, ''), nullif(display_name, ''), 'Partner')
  into resolved_display_name
  from public.profiles
  where id = actor_id;

  resolved_display_name := coalesce(resolved_display_name, 'Partner');

  insert into public.couples (name, created_by)
  values (nullif(p_name, ''), actor_id)
  returning id into created_couple_id;

  insert into public.couple_members (couple_id, user_id, display_name, role)
  values (created_couple_id, actor_id, resolved_display_name, 'primary')
  returning id into created_member_id;

  return query select created_couple_id, created_member_id;
end;
$$;

create or replace function public.create_couple_invite(
  p_couple_id uuid,
  p_invitee_email text default null,
  p_expires_in interval default interval '7 days'
)
returns table (invite_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  created_invite_id uuid;
  created_token text;
  created_expires_at timestamptz;
begin
  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_active_couple_member(p_couple_id) then
    raise exception 'Only active couple members can create invites.';
  end if;

  created_token := public.generate_unique_couple_invite_token();
  created_expires_at := now() + coalesce(p_expires_in, interval '7 days');

  insert into public.couple_invites (
    couple_id,
    created_by,
    token,
    invitee_email,
    expires_at
  )
  values (
    p_couple_id,
    actor_id,
    created_token,
    nullif(p_invitee_email, ''),
    created_expires_at
  )
  returning id into created_invite_id;

  return query select created_invite_id, created_token, created_expires_at;
end;
$$;

create or replace function public.accept_couple_invite(
  p_token text,
  p_display_name text default null
)
returns table (couple_id uuid, member_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  invite_record public.couple_invites%rowtype;
  active_member_count integer;
  existing_member_id uuid;
  accepted_member_id uuid;
  resolved_display_name text;
begin
  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into invite_record
  from public.couple_invites
  where token = p_token
  for update;

  if not found then
    raise exception 'Invite not found.';
  end if;

  if invite_record.revoked_at is not null then
    raise exception 'Invite has been revoked.';
  end if;

  if invite_record.accepted_at is not null then
    raise exception 'Invite has already been accepted.';
  end if;

  if invite_record.expires_at is not null and invite_record.expires_at < now() then
    raise exception 'Invite has expired.';
  end if;

  perform 1
  from public.couples
  where id = invite_record.couple_id
  for update;

  select count(*)
  into active_member_count
  from public.couple_members cm
  where cm.couple_id = invite_record.couple_id
    and cm.is_active = true
    and cm.left_at is null;

  select id
  into existing_member_id
  from public.couple_members
  where couple_id = invite_record.couple_id
    and user_id = actor_id;

  if active_member_count >= 2 and existing_member_id is null then
    raise exception 'This couple already has two active members.';
  end if;

  select coalesce(nullif(p_display_name, ''), nullif(display_name, ''), 'Partner')
  into resolved_display_name
  from public.profiles
  where id = actor_id;

  resolved_display_name := coalesce(resolved_display_name, 'Partner');

  if existing_member_id is not null then
    update public.couple_members
    set display_name = resolved_display_name,
        role = case when role = 'primary' then role else 'partner' end,
        is_active = true,
        left_at = null
    where id = existing_member_id
    returning id into accepted_member_id;
  else
    insert into public.couple_members (couple_id, user_id, display_name, role)
    values (invite_record.couple_id, actor_id, resolved_display_name, 'partner')
    returning id into accepted_member_id;
  end if;

  update public.couple_invites
  set accepted_at = now()
  where id = invite_record.id;

  return query select invite_record.couple_id, accepted_member_id;
end;
$$;

create or replace function public.create_mystery_date(
  p_generated_date_id uuid,
  p_reveal_style text default 'mystery',
  p_teaser text default null,
  p_reveal_at timestamptz default null,
  p_expires_at timestamptz default null
)
returns table (mystery_date_id uuid, token text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  generated_record public.generated_dates%rowtype;
  created_mystery_date_id uuid;
  created_token text;
begin
  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_reveal_style not in ('instant', 'teaser', 'mystery', 'timed') then
    raise exception 'Invalid reveal style.';
  end if;

  select *
  into generated_record
  from public.generated_dates
  where id = p_generated_date_id;

  if not found then
    raise exception 'Generated date not found.';
  end if;

  if generated_record.couple_id is null then
    raise exception 'Mystery dates require a couple.';
  end if;

  if not public.is_active_couple_member(generated_record.couple_id) then
    raise exception 'Only active couple members can create mystery dates.';
  end if;

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
    coalesce(nullif(p_teaser, ''), generated_record.share_teaser),
    p_reveal_at,
    p_expires_at
  )
  returning id into created_mystery_date_id;

  return query select created_mystery_date_id, created_token;
end;
$$;

create or replace function public.reveal_mystery_date(p_token text)
returns public.mystery_dates
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  mystery_record public.mystery_dates%rowtype;
  revealed_record public.mystery_dates%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into mystery_record
  from public.mystery_dates
  where token = p_token
  for update;

  if not found then
    raise exception 'Mystery date not found.';
  end if;

  if mystery_record.expires_at is not null and mystery_record.expires_at < now() then
    raise exception 'Mystery date has expired.';
  end if;

  if not public.is_active_couple_member(mystery_record.couple_id) then
    raise exception 'Only active couple members can reveal this mystery date.';
  end if;

  update public.mystery_dates
  set revealed_at = coalesce(revealed_at, now())
  where id = mystery_record.id
  returning * into revealed_record;

  return revealed_record;
end;
$$;

revoke all on function public.is_active_couple_member(uuid) from public;
revoke all on function public.generate_high_entropy_token() from public;
revoke all on function public.generate_unique_couple_invite_token() from public;
revoke all on function public.generate_unique_mystery_date_token() from public;
revoke all on function public.enforce_max_active_couple_members() from public;
revoke all on function public.prevent_unsafe_mystery_date_update() from public;
revoke all on function public.create_couple_with_member(text, text) from public;
revoke all on function public.create_couple_invite(uuid, text, interval) from public;
revoke all on function public.accept_couple_invite(text, text) from public;
revoke all on function public.create_mystery_date(uuid, text, text, timestamptz, timestamptz) from public;
revoke all on function public.reveal_mystery_date(text) from public;

grant execute on function public.is_active_couple_member(uuid) to authenticated;
grant execute on function public.create_couple_with_member(text, text) to authenticated;
grant execute on function public.create_couple_invite(uuid, text, interval) to authenticated;
grant execute on function public.accept_couple_invite(text, text) to authenticated;
grant execute on function public.create_mystery_date(uuid, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.reveal_mystery_date(text) to authenticated;
