import { describe, expect, it } from 'vitest';

import { formatDuration, formatOptionalDuration } from './formatters';

describe('formatDuration', () => {
  it('formats minutes under an hour', () => {
    expect(formatDuration(45)).toBe('45 min');
  });

  it('formats exact hours', () => {
    expect(formatDuration(120)).toBe('2 hr');
  });

  it('formats hours with remaining minutes', () => {
    expect(formatDuration(95)).toBe('1 hr 35 min');
  });

  it('normalizes decimal, negative, and non-finite values defensively', () => {
    expect(formatDuration(89.6)).toBe('1 hr 30 min');
    expect(formatDuration(-15)).toBe('0 min');
    expect(formatDuration(Number.NaN)).toBe('0 min');
  });
});

describe('formatOptionalDuration', () => {
  it('omits missing or zero durations', () => {
    expect(formatOptionalDuration()).toBeUndefined();
    expect(formatOptionalDuration(0)).toBeUndefined();
    expect(formatOptionalDuration(-5)).toBeUndefined();
  });

  it('formats present durations', () => {
    expect(formatOptionalDuration(75)).toBe('1 hr 15 min');
  });
});
