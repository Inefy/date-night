import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-linking', () => ({
  createURL: (path: string, options?: { queryParams?: Record<string, string> }) => {
    const query = options?.queryParams
      ? `?${new URLSearchParams(options.queryParams).toString()}`
      : '';

    return `datenightdeck://${path.replace(/^\//, '')}${query}`;
  },
}));

vi.mock('react-native', () => ({
  Share: { share: vi.fn() },
}));

vi.mock('@/lib/supabase', () => ({
  requireSupabaseClient: vi.fn(),
}));

import { buildCoupleInviteLink, extractInviteToken } from './coupleService';

const inviteToken = 'abcDEF1234567890-_';

describe('couple invite helpers', () => {
  it('extracts invite tokens from production links', () => {
    expect(
      extractInviteToken(`https://datenightdeck.app/onboarding/couple-setup?invite=${inviteToken}`),
    ).toBe(inviteToken);
  });

  it('extracts invite tokens from app-relative links', () => {
    expect(extractInviteToken(`/onboarding/couple-setup?token=${inviteToken}`)).toBe(inviteToken);
  });

  it('keeps bare invite tokens', () => {
    expect(extractInviteToken(`  ${inviteToken}  `)).toBe(inviteToken);
  });

  it('rejects malformed encoded invite params without throwing', () => {
    expect(extractInviteToken('/onboarding/couple-setup?invite=%E0%A4%A')).toBe('');
  });

  it('rejects short or non-url-safe invite tokens', () => {
    expect(extractInviteToken('short')).toBe('');
    expect(extractInviteToken('abcDEF1234567890!')).toBe('');
  });

  it('builds invite links with the invite query param', () => {
    expect(buildCoupleInviteLink(inviteToken)).toBe(
      `datenightdeck://onboarding/couple-setup?invite=${encodeURIComponent(inviteToken)}`,
    );
  });
});
