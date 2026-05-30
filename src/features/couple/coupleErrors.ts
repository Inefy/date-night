// src/features/couple/coupleErrors.ts
import { toFriendlyAuthError } from '@/features/auth/authErrors';

export function toFriendlyCoupleError(error: unknown): string {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const message = rawMessage.toLowerCase();

  if (message.includes('already in a couple') || message.includes('one_active_couple')) {
    return 'You already have a couple deck. Open Couple to invite or manage your partner.';
  }

  if (message.includes('invite not found') || message.includes('invalid invite')) {
    return 'That invite code does not look right. Check the link and try again.';
  }

  if (
    message.includes('expired') ||
    message.includes('revoked') ||
    message.includes('already been accepted')
  ) {
    return 'That invite can no longer be used. Ask your partner for a fresh one.';
  }

  if (
    message.includes('two active members') ||
    message.includes('couple full') ||
    message.includes('at most two')
  ) {
    return 'That couple deck already has two active members.';
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return 'We could not reach the couple service. Check your connection and try again.';
  }

  return toFriendlyAuthError(error);
}
