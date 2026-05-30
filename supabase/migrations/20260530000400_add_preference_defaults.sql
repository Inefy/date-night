-- supabase/migrations/20260530000400_add_preference_defaults.sql
alter table public.profiles
  add column if not exists default_duration_minutes integer,
  add column if not exists preferred_vibes text[] not null default '{}',
  add column if not exists preferred_food_modes text[] not null default '{}',
  add column if not exists dietary_preferences text[] not null default '{}',
  add column if not exists rainy_indoor_preference text;

alter table public.profiles
  add constraint profiles_default_duration_minutes_check check (
    default_duration_minutes is null
    or (default_duration_minutes >= 30 and default_duration_minutes <= 360)
  ),
  add constraint profiles_preferred_vibes_check check (
    preferred_vibes <@ array[
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
  add constraint profiles_preferred_food_modes_check check (
    preferred_food_modes <@ array['none', 'snack', 'meal', 'dessert', 'drinks']
  ),
  add constraint profiles_dietary_preferences_check check (
    dietary_preferences <@ array[
      'food_optional',
      'vegetarian_friendly',
      'vegan_adaptable',
      'gluten_free_adaptable',
      'allergy_adaptable',
      'bring_your_own'
    ]
  ),
  add constraint profiles_rainy_indoor_preference_check check (
    rainy_indoor_preference is null
    or rainy_indoor_preference in ('indoor', 'outdoor', 'weather_flexible')
  );

alter table public.couples
  add column if not exists default_preferences jsonb not null default '{}'::jsonb,
  add constraint couples_default_preferences_object_check check (
    jsonb_typeof(default_preferences) = 'object'
  );

grant update (
  default_duration_minutes,
  dietary_preferences,
  preferred_food_modes,
  preferred_vibes,
  rainy_indoor_preference
) on table public.profiles to authenticated;

grant insert (
  default_duration_minutes,
  dietary_preferences,
  preferred_food_modes,
  preferred_vibes,
  rainy_indoor_preference
) on table public.profiles to authenticated;

grant update (default_preferences) on table public.couples to authenticated;
