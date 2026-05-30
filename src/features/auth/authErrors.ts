// src/features/auth/authErrors.ts
export function toFriendlyAuthError(error: unknown): string {
  const rawMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const message = rawMessage.toLowerCase();

  if (message.includes('supabase is not configured')) {
    return 'Sign in is not connected yet. Add your Supabase URL and publishable key to the local environment.';
  }

  if (message.includes('invalid login credentials')) {
    return 'That sign-in link is no longer valid. Request a fresh email link and try again.';
  }

  if (message.includes('email rate limit') || message.includes('rate limit')) {
    return 'Too many sign-in emails were requested. Wait a minute, then try again.';
  }

  if (message.includes('network') || message.includes('fetch')) {
    return 'We could not reach the auth service. Check your connection and try again.';
  }

  if (message.includes('row-level security') || message.includes('permission denied')) {
    return 'You are signed in, but profile setup is blocked by database permissions. Apply the latest Supabase migrations.';
  }

  if (rawMessage.trim().length > 0) {
    return rawMessage;
  }

  return 'We could not complete that auth request. Try again in a minute.';
}
