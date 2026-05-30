// src/features/couple/coupleTypes.ts
import type { DateNightPreferences } from '@/features/preferences/preferencesTypes';

export type CoupleMemberSummary = {
  displayName: string;
  id: string;
  isCurrentUser: boolean;
  joinedAt: string;
  role: 'primary' | 'partner';
  userId: string;
};

export type CoupleInviteSummary = {
  expiresAt?: string;
  id: string;
  token: string;
};

export type CoupleProfile = {
  defaultPreferences: DateNightPreferences;
  id: string;
  members: CoupleMemberSummary[];
  name?: string;
  pendingInvite?: CoupleInviteSummary;
};

export type CoupleInvite = {
  expiresAt?: string;
  id: string;
  link: string;
  token: string;
};
