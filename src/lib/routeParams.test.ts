import { describe, expect, it } from 'vitest';

import { getFirstRouteParam, getSafeReturnPath, isSafeReturnPath } from './routeParams';

describe('getFirstRouteParam', () => {
  it('returns the first value from Expo Router array params', () => {
    expect(getFirstRouteParam(['first', 'second'])).toBe('first');
  });

  it('returns scalar params unchanged', () => {
    expect(getFirstRouteParam('single')).toBe('single');
  });

  it('returns undefined for missing params', () => {
    expect(getFirstRouteParam(undefined)).toBeUndefined();
  });
});

describe('isSafeReturnPath', () => {
  it('accepts app-relative paths', () => {
    expect(isSafeReturnPath('/tabs/home')).toBe(true);
    expect(isSafeReturnPath('/date/local-id?from=favorites')).toBe(true);
  });

  it('rejects external or malformed paths', () => {
    expect(isSafeReturnPath('https://example.com')).toBe(false);
    expect(isSafeReturnPath('//example.com')).toBe(false);
    expect(isSafeReturnPath('/tabs/home\n/other')).toBe(false);
    expect(isSafeReturnPath('/tabs\\home')).toBe(false);
  });
});

describe('getSafeReturnPath', () => {
  it('uses the first safe returnTo value', () => {
    expect(getSafeReturnPath(['/tabs/settings', '/tabs/home'])).toBe('/tabs/settings');
  });

  it('falls back when returnTo is unsafe', () => {
    expect(getSafeReturnPath('//example.com')).toBe('/tabs/home');
    expect(getSafeReturnPath('https://example.com', '/welcome')).toBe('/welcome');
  });
});
