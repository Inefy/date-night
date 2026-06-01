import { describe, expect, it } from 'vitest';

import { isUuid } from './uuid';

describe('isUuid', () => {
  it('accepts supported UUID versions with RFC variant bits', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isUuid('123e4567-e89b-42d3-9456-426614174000')).toBe(true);
  });

  it('rejects missing, malformed, and non-string values', () => {
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(123)).toBe(false);
    expect(isUuid('local-generated-date')).toBe(false);
    expect(isUuid('123e4567-e89b-72d3-a456-426614174000')).toBe(false);
    expect(isUuid('123e4567-e89b-12d3-c456-426614174000')).toBe(false);
  });
});
