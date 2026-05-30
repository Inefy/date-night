// src/features/mystery/mysteryService.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-clipboard', () => ({
  setStringAsync: vi.fn(),
}));

vi.mock('react-native', () => ({
  Share: { share: vi.fn() },
}));

vi.mock('@/features/couple/coupleService', () => ({
  buildCoupleInviteLink: (token: string) => `datenightdeck://onboarding/couple-setup?invite=${token}`,
}));

vi.mock('@/features/generatedDates/generatedDateService', () => ({
  getGeneratedDateById: vi.fn(),
  isPersistedGeneratedDateId: vi.fn(() => true),
}));

vi.mock('@/lib/supabase', () => ({
  requireSupabaseClient: vi.fn(),
}));

import { buildMysteryLink, buildMysteryShareMessage, parseMysteryLink } from './mysteryService';

const token = 'abcDEF1234567890';

describe('mystery link helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds and parses production mystery links', () => {
    const link = buildMysteryLink(token, 'production');

    expect(link).toBe(`https://datenightdeck.app/mystery/${token}`);
    expect(parseMysteryLink(link)).toEqual({ token });
  });

  it('builds and parses development mystery links', () => {
    const link = buildMysteryLink(token, 'development');

    expect(link).toBe(`datenightdeck://mystery/${token}`);
    expect(parseMysteryLink(link)).toEqual({ token });
  });

  it('rejects invalid or short mystery tokens', () => {
    expect(parseMysteryLink('datenightdeck://mystery/short')).toBeUndefined();
    expect(parseMysteryLink('https://datenightdeck.app/not-mystery/abcDEF1234567890')).toBeUndefined();
  });

  it('formats the native share message with the configured development link', () => {
    vi.stubGlobal('__DEV__', true);

    expect(buildMysteryShareMessage(token)).toBe(
      `I made us a mystery date. No peeking until you open it: datenightdeck://mystery/${token}`,
    );
  });
});
