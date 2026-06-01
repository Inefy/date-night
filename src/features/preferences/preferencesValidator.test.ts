import { describe, expect, it } from 'vitest';

import { defaultDateNightPreferences, type DateNightPreferences } from './preferencesTypes';
import { normalizePreferences, validatePreferences } from './preferencesValidator';

describe('normalizePreferences', () => {
  it('falls back to the default duration for malformed stored values', () => {
    expect(
      normalizePreferences({
        defaultDurationMinutes: Number.NaN,
      }).defaultDurationMinutes,
    ).toBe(defaultDateNightPreferences.defaultDurationMinutes);
  });

  it('keeps valid list values unique and drops unknown values', () => {
    const normalized = normalizePreferences({
      foodPreferences: ['snack', 'snack', 'unknown'] as unknown as DateNightPreferences['foodPreferences'],
      preferredVibes: ['cozy', 'cozy', 'romantic', 'unknown'] as unknown as DateNightPreferences['preferredVibes'],
    });

    expect(normalized.foodPreferences).toEqual(['snack']);
    expect(normalized.preferredVibes).toEqual(['cozy', 'romantic']);
  });
});

describe('validatePreferences', () => {
  it('rejects non-finite durations', () => {
    const result = validatePreferences({
      ...defaultDateNightPreferences,
      defaultDurationMinutes: Number.NaN,
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? undefined : result.errors.defaultDurationMinutes).toBe(
      'Choose a default duration between 30 minutes and 6 hours.',
    );
  });

  it('rejects fractional durations', () => {
    const result = validatePreferences({
      ...defaultDateNightPreferences,
      defaultDurationMinutes: 90.5,
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? undefined : result.errors.defaultDurationMinutes).toBe(
      'Choose a default duration between 30 minutes and 6 hours.',
    );
  });

  it('returns normalized preferences when input is valid', () => {
    const result = validatePreferences({
      ...defaultDateNightPreferences,
      foodPreferences: ['snack', 'snack'],
      preferredVibes: ['cozy', 'romantic', 'cozy'],
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.value.foodPreferences : undefined).toEqual(['snack']);
    expect(result.ok ? result.value.preferredVibes : undefined).toEqual(['cozy', 'romantic']);
  });
});
