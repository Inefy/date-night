// src/features/preferences/preferencesValidator.ts
import {
  budgetLevels,
  dateVibes,
  dietaryFlexibilityModes,
  energyLevels,
  foodModes,
  locationModes,
  weatherModes,
} from '@/types/domain';

import {
  defaultDateNightPreferences,
  type DateNightPreferences,
} from './preferencesTypes';

export type PreferenceValidationErrors = Partial<Record<keyof DateNightPreferences, string>>;

export type PreferenceValidationResult =
  | { errors: PreferenceValidationErrors; ok: false }
  | { ok: true; value: DateNightPreferences };

function isOneOf<T extends string | number>(options: readonly T[], value: unknown): value is T {
  return options.includes(value as T);
}

function uniqueValidValues<T extends string>(
  values: unknown,
  options: readonly T[],
  fallback: readonly T[],
): T[] {
  if (!Array.isArray(values)) {
    return [...fallback];
  }

  return values.filter((value, index, array): value is T => {
    return isOneOf(options, value) && array.indexOf(value) === index;
  });
}

export function normalizePreferences(input: Partial<DateNightPreferences>): DateNightPreferences {
  return {
    defaultBudget: isOneOf(budgetLevels, input.defaultBudget)
      ? input.defaultBudget
      : defaultDateNightPreferences.defaultBudget,
    defaultDurationMinutes:
      typeof input.defaultDurationMinutes === 'number'
        ? input.defaultDurationMinutes
        : defaultDateNightPreferences.defaultDurationMinutes,
    defaultEnergy: isOneOf(energyLevels, input.defaultEnergy)
      ? input.defaultEnergy
      : defaultDateNightPreferences.defaultEnergy,
    defaultLocationMode: isOneOf(locationModes, input.defaultLocationMode)
      ? input.defaultLocationMode
      : defaultDateNightPreferences.defaultLocationMode,
    dietaryPreferences: uniqueValidValues(
      input.dietaryPreferences,
      dietaryFlexibilityModes,
      defaultDateNightPreferences.dietaryPreferences,
    ),
    foodPreferences: uniqueValidValues(
      input.foodPreferences,
      foodModes,
      defaultDateNightPreferences.foodPreferences,
    ),
    preferredVibes: uniqueValidValues(
      input.preferredVibes,
      dateVibes,
      defaultDateNightPreferences.preferredVibes,
    ),
    rainyIndoorPreference: isOneOf(weatherModes, input.rainyIndoorPreference)
      ? input.rainyIndoorPreference
      : defaultDateNightPreferences.rainyIndoorPreference,
  };
}

export function validatePreferences(input: DateNightPreferences): PreferenceValidationResult {
  const normalized = normalizePreferences(input);
  const errors: PreferenceValidationErrors = {};

  if (normalized.defaultDurationMinutes < 30 || normalized.defaultDurationMinutes > 360) {
    errors.defaultDurationMinutes = 'Choose a default duration between 30 minutes and 6 hours.';
  }

  if (normalized.preferredVibes.length === 0) {
    errors.preferredVibes = 'Pick at least one vibe, or use Skip to keep the starter set.';
  }

  if (normalized.preferredVibes.length > 6) {
    errors.preferredVibes = 'Keep the starter deck focused with six vibes or fewer.';
  }

  if (normalized.foodPreferences.length === 0) {
    errors.foodPreferences = 'Choose at least one food preference.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, ok: false };
  }

  return { ok: true, value: normalized };
}
