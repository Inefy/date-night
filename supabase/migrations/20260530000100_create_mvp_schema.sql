-- supabase/migrations/20260530000100_create_mvp_schema.sql
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  avatar_url text,
  timezone text,
  preferred_budget text,
  preferred_energy text,
  preferred_location_mode text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_preferred_budget_check check (
    preferred_budget is null or preferred_budget in ('free', 'low', 'moderate', 'high', 'splurge')
  ),
  constraint profiles_preferred_energy_check check (
    preferred_energy is null or preferred_energy in ('low', 'medium', 'high')
  ),
  constraint profiles_preferred_location_mode_check check (
    preferred_location_mode is null or preferred_location_mode in ('at_home', 'out', 'hybrid', 'virtual')
  )
);

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.couple_members (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  role text not null default 'partner',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint couple_members_role_check check (role in ('primary', 'partner')),
  constraint couple_members_unique_user_per_couple unique (couple_id, user_id)
);

create table public.couple_invites (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  token text not null unique,
  invitee_email text,
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.date_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  title text not null,
  premise text not null,
  vibe_tags text[] not null default '{}',
  budget text not null,
  estimated_duration_minutes integer not null,
  duration_min_minutes integer not null,
  duration_max_minutes integer not null,
  energy text not null,
  energy_range text[] not null default '{}',
  location_mode text not null,
  location_modes text[] not null default '{}',
  weather_mode text not null,
  weather_modes text[] not null default '{}',
  food_mode text not null,
  food_modes text[] not null default '{}',
  dietary_flexibility text[] not null default '{}',
  talking_level text not null,
  prep_level text not null,
  steps jsonb not null default '[]'::jsonb,
  prep_items text[] not null default '{}',
  conversation_prompts text[] not null default '{}',
  twist text not null,
  backup_plan text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint date_templates_budget_check check (budget in ('free', 'low', 'moderate', 'high', 'splurge')),
  constraint date_templates_vibe_tags_check check (
    vibe_tags <@ array[
      'cozy',
      'chaotic',
      'cheap',
      'romantic',
      'playful',
      'first_date',
      'in_a_rut',
      'rainy_day',
      'anniversary_rescue',
      'low_energy',
      'no_talking',
      'deep_conversation',
      'stay_at_home',
      'adventure',
      'awkward_funny',
      'surprise_me',
      'adventurous',
      'creative',
      'reflective',
      'celebratory',
      'low_key',
      'spontaneous'
    ]
  ),
  constraint date_templates_duration_check check (
    estimated_duration_minutes > 0
    and duration_min_minutes > 0
    and duration_max_minutes >= duration_min_minutes
  ),
  constraint date_templates_energy_check check (energy in ('low', 'medium', 'high')),
  constraint date_templates_energy_range_check check (
    energy_range <@ array['low', 'medium', 'high']
  ),
  constraint date_templates_location_mode_check check (location_mode in ('at_home', 'out', 'hybrid', 'virtual')),
  constraint date_templates_location_modes_check check (
    location_modes <@ array['at_home', 'out', 'hybrid', 'virtual']
  ),
  constraint date_templates_weather_mode_check check (weather_mode in ('indoor', 'outdoor', 'weather_flexible')),
  constraint date_templates_weather_modes_check check (
    weather_modes <@ array['indoor', 'outdoor', 'weather_flexible']
  ),
  constraint date_templates_food_mode_check check (food_mode in ('none', 'snack', 'meal', 'dessert', 'drinks')),
  constraint date_templates_food_modes_check check (
    food_modes <@ array['none', 'snack', 'meal', 'dessert', 'drinks']
  ),
  constraint date_templates_dietary_flexibility_check check (
    dietary_flexibility <@ array[
      'food_optional',
      'vegetarian_friendly',
      'vegan_adaptable',
      'gluten_free_adaptable',
      'allergy_adaptable',
      'bring_your_own'
    ]
  ),
  constraint date_templates_talking_level_check check (talking_level in ('quiet', 'light', 'meaningful', 'deep')),
  constraint date_templates_prep_level_check check (prep_level in ('none', 'light', 'medium', 'planned')),
  constraint date_templates_steps_array_check check (jsonb_typeof(steps) = 'array')
);

create table public.generated_dates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete cascade,
  source_template_id uuid references public.date_templates(id) on delete set null,
  seed text not null,
  title text not null,
  premise text not null,
  vibe_tags text[] not null default '{}',
  estimated_budget_label text not null,
  estimated_duration_minutes integer not null,
  energy text not null,
  location_mode text not null,
  food_plan text not null,
  steps jsonb not null default '[]'::jsonb,
  prep_items text[] not null default '{}',
  twist text not null,
  conversation_prompt text not null,
  backup_plan text not null,
  calendar_title text not null,
  calendar_description text not null,
  share_teaser text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generated_dates_vibe_tags_check check (
    vibe_tags <@ array[
      'cozy',
      'chaotic',
      'cheap',
      'romantic',
      'playful',
      'first_date',
      'in_a_rut',
      'rainy_day',
      'anniversary_rescue',
      'low_energy',
      'no_talking',
      'deep_conversation',
      'stay_at_home',
      'adventure',
      'awkward_funny',
      'surprise_me',
      'adventurous',
      'creative',
      'reflective',
      'celebratory',
      'low_key',
      'spontaneous'
    ]
  ),
  constraint generated_dates_energy_check check (energy in ('low', 'medium', 'high')),
  constraint generated_dates_location_mode_check check (location_mode in ('at_home', 'out', 'hybrid', 'virtual')),
  constraint generated_dates_duration_check check (estimated_duration_minutes > 0),
  constraint generated_dates_steps_array_check check (jsonb_typeof(steps) = 'array'),
  constraint generated_dates_filters_object_check check (jsonb_typeof(filters) = 'object')
);

create table public.mystery_dates (
  id uuid primary key default gen_random_uuid(),
  generated_date_id uuid not null references public.generated_dates(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  token text not null unique,
  reveal_style text not null,
  teaser text not null,
  reveal_at timestamptz,
  revealed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mystery_dates_reveal_style_check check (reveal_style in ('instant', 'teaser', 'mystery', 'timed'))
);

create table public.favorite_dates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete cascade,
  generated_date_id uuid references public.generated_dates(id) on delete cascade,
  source_template_id uuid references public.date_templates(id) on delete set null,
  note text,
  favorited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint favorite_dates_unique_generated_date_per_user unique (user_id, generated_date_id)
);

create table public.date_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete cascade,
  generated_date_id uuid references public.generated_dates(id) on delete cascade,
  source_template_id uuid references public.date_templates(id) on delete set null,
  plan_seed text not null,
  rating text not null,
  budget_fit text,
  energy_fit text,
  would_repeat boolean,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint date_feedback_rating_check check (rating in ('liked', 'neutral', 'disliked')),
  constraint date_feedback_budget_fit_check check (
    budget_fit is null or budget_fit in ('free', 'low', 'moderate', 'high', 'splurge')
  ),
  constraint date_feedback_energy_fit_check check (
    energy_fit is null or energy_fit in ('low', 'medium', 'high')
  )
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  couple_id uuid references public.couples(id) on delete cascade,
  generated_date_id uuid not null references public.generated_dates(id) on delete cascade,
  title text not null,
  description text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  provider text,
  external_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_provider_check check (
    provider is null or provider in ('device', 'google', 'apple', 'outlook')
  ),
  constraint calendar_events_time_check check (
    starts_at is null or ends_at is null or ends_at >= starts_at
  )
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  couple_id uuid references public.couples(id) on delete set null,
  generated_date_id uuid references public.generated_dates(id) on delete set null,
  event_name text not null,
  event_properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analytics_events_name_check check (
    event_name in (
      'date_generated',
      'date_viewed',
      'date_saved',
      'date_remixed',
      'mystery_created',
      'mystery_revealed',
      'feedback_submitted',
      'calendar_event_created'
    )
  ),
  constraint analytics_events_properties_object_check check (jsonb_typeof(event_properties) = 'object')
);

create index profiles_email_idx on public.profiles (email);
create index couples_created_by_idx on public.couples (created_by);
create index couple_members_couple_id_idx on public.couple_members (couple_id);
create index couple_members_user_id_idx on public.couple_members (user_id);
create index couple_invites_couple_id_idx on public.couple_invites (couple_id);
create index couple_invites_token_idx on public.couple_invites (token);
create index date_templates_is_active_idx on public.date_templates (is_active);
create index date_templates_budget_idx on public.date_templates (budget);
create index date_templates_energy_idx on public.date_templates (energy);
create index date_templates_location_mode_idx on public.date_templates (location_mode);
create index generated_dates_user_id_idx on public.generated_dates (user_id);
create index generated_dates_couple_id_idx on public.generated_dates (couple_id);
create index generated_dates_source_template_id_idx on public.generated_dates (source_template_id);
create index mystery_dates_generated_date_id_idx on public.mystery_dates (generated_date_id);
create index mystery_dates_couple_id_idx on public.mystery_dates (couple_id);
create index mystery_dates_token_idx on public.mystery_dates (token);
create index favorite_dates_user_id_idx on public.favorite_dates (user_id);
create index favorite_dates_couple_id_idx on public.favorite_dates (couple_id);
create index favorite_dates_generated_date_id_idx on public.favorite_dates (generated_date_id);
create index date_feedback_user_id_idx on public.date_feedback (user_id);
create index date_feedback_couple_id_idx on public.date_feedback (couple_id);
create index date_feedback_generated_date_id_idx on public.date_feedback (generated_date_id);
create index calendar_events_user_id_idx on public.calendar_events (user_id);
create index calendar_events_couple_id_idx on public.calendar_events (couple_id);
create index calendar_events_generated_date_id_idx on public.calendar_events (generated_date_id);
create index analytics_events_user_id_idx on public.analytics_events (user_id);
create index analytics_events_couple_id_idx on public.analytics_events (couple_id);
create index analytics_events_generated_date_id_idx on public.analytics_events (generated_date_id);
create index analytics_events_event_name_idx on public.analytics_events (event_name);
create index analytics_events_occurred_at_idx on public.analytics_events (occurred_at);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger couples_set_updated_at
before update on public.couples
for each row execute function public.set_updated_at();

create trigger couple_members_set_updated_at
before update on public.couple_members
for each row execute function public.set_updated_at();

create trigger couple_invites_set_updated_at
before update on public.couple_invites
for each row execute function public.set_updated_at();

create trigger date_templates_set_updated_at
before update on public.date_templates
for each row execute function public.set_updated_at();

create trigger generated_dates_set_updated_at
before update on public.generated_dates
for each row execute function public.set_updated_at();

create trigger mystery_dates_set_updated_at
before update on public.mystery_dates
for each row execute function public.set_updated_at();

create trigger favorite_dates_set_updated_at
before update on public.favorite_dates
for each row execute function public.set_updated_at();

create trigger date_feedback_set_updated_at
before update on public.date_feedback
for each row execute function public.set_updated_at();

create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

create trigger analytics_events_set_updated_at
before update on public.analytics_events
for each row execute function public.set_updated_at();
