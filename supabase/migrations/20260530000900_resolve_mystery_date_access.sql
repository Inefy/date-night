-- supabase/migrations/20260530000900_resolve_mystery_date_access.sql
create or replace function public.resolve_mystery_date_access(p_token text)
returns table (
  status text,
  mystery_date_id uuid,
  generated_date_id uuid,
  couple_id uuid,
  reveal_style text,
  teaser text,
  created_at timestamptz,
  expires_at timestamptz,
  revealed_at timestamptz,
  invite_token text,
  invite_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  active_member_count integer := 0;
  actor_active_couple_id uuid;
  actor_is_member boolean := false;
  resolved_status text := 'invalid';
  mystery_record public.mystery_dates%rowtype;
  pending_invite public.couple_invites%rowtype;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{16,256}$' then
    return query
    select
      'invalid'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::timestamptz,
      null::timestamptz,
      null::timestamptz,
      null::text,
      null::timestamptz;
    return;
  end if;

  select *
  into mystery_record
  from public.mystery_dates md
  where md.token = p_token;

  if not found then
    return query
    select
      'invalid'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::timestamptz,
      null::timestamptz,
      null::timestamptz,
      null::text,
      null::timestamptz;
    return;
  end if;

  select count(*)::integer
  into active_member_count
  from public.couple_members cm
  where cm.couple_id = mystery_record.couple_id
    and cm.is_active = true
    and cm.left_at is null;

  if actor_id is not null then
    select exists (
      select 1
      from public.couple_members cm
      where cm.couple_id = mystery_record.couple_id
        and cm.user_id = actor_id
        and cm.is_active = true
        and cm.left_at is null
    )
    into actor_is_member;

    select cm.couple_id
    into actor_active_couple_id
    from public.couple_members cm
    where cm.user_id = actor_id
      and cm.is_active = true
      and cm.left_at is null
    order by cm.joined_at desc
    limit 1;
  end if;

  select *
  into pending_invite
  from public.couple_invites ci
  where ci.couple_id = mystery_record.couple_id
    and ci.accepted_at is null
    and ci.revoked_at is null
    and ci.expires_at > now()
  order by ci.created_at desc
  limit 1;

  if mystery_record.expires_at is not null and mystery_record.expires_at < now() then
    resolved_status := 'expired';
  elsif actor_is_member and mystery_record.revealed_at is not null then
    resolved_status := 'revealed';
  elsif actor_is_member then
    resolved_status := 'locked';
  elsif actor_id is null then
    resolved_status := 'auth_required';
  elsif actor_active_couple_id is not null and actor_active_couple_id <> mystery_record.couple_id then
    resolved_status := 'wrong_couple';
  elsif active_member_count >= 2 then
    resolved_status := 'couple_full';
  elsif pending_invite.id is not null then
    resolved_status := 'join_available';
  else
    resolved_status := 'wrong_couple';
  end if;

  return query
  select
    resolved_status,
    mystery_record.id,
    mystery_record.generated_date_id,
    mystery_record.couple_id,
    mystery_record.reveal_style,
    mystery_record.teaser,
    mystery_record.created_at,
    mystery_record.expires_at,
    mystery_record.revealed_at,
    case when resolved_status = 'join_available' then pending_invite.token else null end,
    case when resolved_status = 'join_available' then pending_invite.expires_at else null end;
end;
$$;

grant usage on schema public to anon, authenticated;
grant execute on function public.resolve_mystery_date_access(text) to anon, authenticated;
