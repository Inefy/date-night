// src/features/preferences/preferencesTypes.ts
import type {
  BudgetLevel,
  DateVibe,
  DietaryFlexibility,
  EnergyLevel,
  FoodMode,
  LocationMode,
  WeatherMode,
} from '@/types/domain';

export type DateNightPreferences = {
  defaultBudget: BudgetLevel;
  defaultDurationMinutes: number;
  defaultEnergy: EnergyLevel;
  defaultLocationMode: LocationMode;
  dietaryPreferences: DietaryFlexibility[];
  foodPreferences: FoodMode[];
  preferredVibes: DateVibe[];
  rainyIndoorPreference: WeatherMode;
};

export type PreferenceSaveResult = {
  coupleId?: string;
  coupleSynced: boolean;
  localSaved: boolean;
  profileSynced: boolean;
  remoteError?: string;
};

export const preferenceStorageKey = 'date-night-deck/preferences/v1';

export const defaultDateNightPreferences: DateNightPreferences = {
  defaultBudget: 'moderate',
  defaultDurationMinutes: 90,
  defaultEnergy: 'medium',
  defaultLocationMode: 'hybrid',
  dietaryPreferences: ['food_optional'],
  foodPreferences: ['snack', 'dessert'],
  preferredVibes: ['cozy', 'romantic', 'playful'],
  rainyIndoorPreference: 'weather_flexible',
};

export function createDefaultDateNightPreferences(): DateNightPreferences {
  return {
    ...defaultDateNightPreferences,
    dietaryPreferences: [...defaultDateNightPreferences.dietaryPreferences],
    foodPreferences: [...defaultDateNightPreferences.foodPreferences],
    preferredVibes: [...defaultDateNightPreferences.preferredVibes],
  };
}

export const preferenceVibeOptions: Array<{ label: string; value: DateVibe }> = [
  { label: 'Cozy', value: 'cozy' },
  { label: 'Romantic', value: 'romantic' },
  { label: 'Playful', value: 'playful' },
  { label: 'Cheap', value: 'cheap' },
  { label: 'Chaotic', value: 'chaotic' },
  { label: 'No talking', value: 'no_talking' },
  { label: 'First date', value: 'first_date' },
  { label: 'In a rut', value: 'in_a_rut' },
  { label: 'Rainy day', value: 'rainy_day' },
  { label: 'Anniversary', value: 'anniversary_rescue' },
  { label: 'Low energy', value: 'low_energy' },
  { label: 'Deep talk', value: 'deep_conversation' },
  { label: 'Stay home', value: 'stay_at_home' },
  { label: 'Adventure', value: 'adventure' },
  { label: 'Awkward funny', value: 'awkward_funny' },
  { label: 'Surprise me', value: 'surprise_me' },
];

export const dietaryPreferenceOptions: Array<{ label: string; value: DietaryFlexibility }> = [
  { label: 'Food optional', value: 'food_optional' },
  { label: 'Vegetarian friendly', value: 'vegetarian_friendly' },
  { label: 'Vegan adaptable', value: 'vegan_adaptable' },
  { label: 'Gluten-free adaptable', value: 'gluten_free_adaptable' },
  { label: 'Allergy adaptable', value: 'allergy_adaptable' },
  { label: 'Bring our own', value: 'bring_your_own' },
];
