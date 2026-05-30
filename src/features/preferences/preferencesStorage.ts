// src/features/preferences/preferencesStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

import { toFriendlyAuthError } from '../auth/authErrors';
import type { GeneratorFilterState } from '../generator/generatorTypes';
import {
  createDefaultDateNightPreferences,
  defaultDateNightPreferences,
  preferenceStorageKey,
  type DateNightPreferences,
  type PreferenceSaveResult,
} from './preferencesTypes';
import { normalizePreferences } from './preferencesValidator';

type CoupleMemberRow = {
  couple_id: string;
};

function toDatabasePreferences(preferences: DateNightPreferences) {
  return {
    default_budget: preferences.defaultBudget,
    default_duration_minutes: preferences.defaultDurationMinutes,
    default_energy: preferences.defaultEnergy,
    default_location_mode: preferences.defaultLocationMode,
    dietary_preferences: preferences.dietaryPreferences,
    food_preferences: preferences.foodPreferences,
    preferred_vibes: preferences.preferredVibes,
    rainy_indoor_preference: preferences.rainyIndoorPreference,
  };
}

export function preferencesToGeneratorFilters(
  preferences: DateNightPreferences,
): GeneratorFilterState {
  return {
    energy: preferences.defaultEnergy,
    foodMode: preferences.foodPreferences[0],
    locationMode: preferences.defaultLocationMode,
    maxBudget: preferences.defaultBudget,
    maxDurationMinutes: preferences.defaultDurationMinutes,
    rainyDay: preferences.rainyIndoorPreference === 'indoor',
    vibe: preferences.preferredVibes[0],
    weatherMode:
      preferences.rainyIndoorPreference === 'indoor'
        ? undefined
        : preferences.rainyIndoorPreference,
  };
}

export async function getLocalPreferences(): Promise<DateNightPreferences> {
  const storedValue = await AsyncStorage.getItem(preferenceStorageKey);

  if (!storedValue) {
    return createDefaultDateNightPreferences();
  }

  try {
    return normalizePreferences(JSON.parse(storedValue) as Partial<DateNightPreferences>);
  } catch {
    return createDefaultDateNightPreferences();
  }
}

export async function saveLocalPreferences(preferences: DateNightPreferences) {
  await AsyncStorage.setItem(preferenceStorageKey, JSON.stringify(preferences));
}

export async function saveDateNightPreferences(
  preferences: DateNightPreferences,
  user: User | null,
): Promise<PreferenceSaveResult> {
  await saveLocalPreferences(preferences);

  const result: PreferenceSaveResult = {
    coupleSynced: false,
    localSaved: true,
    profileSynced: false,
  };

  if (!user || !supabase) {
    return result;
  }

  try {
    const databasePreferences = toDatabasePreferences(preferences);
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        default_duration_minutes: preferences.defaultDurationMinutes,
        dietary_preferences: preferences.dietaryPreferences,
        preferred_budget: preferences.defaultBudget,
        preferred_energy: preferences.defaultEnergy,
        preferred_food_modes: preferences.foodPreferences,
        preferred_location_mode: preferences.defaultLocationMode,
        preferred_vibes: preferences.preferredVibes,
        rainy_indoor_preference: preferences.rainyIndoorPreference,
      })
      .eq('id', user.id);

    if (profileError) {
      throw profileError;
    }

    result.profileSynced = true;

    const { data: member, error: memberError } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .is('left_at', null)
      .limit(1)
      .maybeSingle<CoupleMemberRow>();

    if (memberError) {
      throw memberError;
    }

    if (!member?.couple_id) {
      return result;
    }

    const { error: coupleError } = await supabase
      .from('couples')
      .update({ default_preferences: databasePreferences })
      .eq('id', member.couple_id);

    if (coupleError) {
      throw coupleError;
    }

    result.coupleId = member.couple_id;
    result.coupleSynced = true;

    return result;
  } catch (error) {
    return {
      ...result,
      remoteError: toFriendlyAuthError(error),
    };
  }
}
