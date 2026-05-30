// src/features/auth/RequireAuth.tsx
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'expo-router';

import { Button, Card, LoadingState, Screen, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';

import { useAuth } from './AuthProvider';

type RequireAuthProps = {
  children: ReactNode;
  message?: string;
  returnTo?: string;
  title?: string;
};

export function RequireAuth({
  children,
  message = 'Sign in to use this part of Date Night Deck.',
  returnTo,
  title = 'Sign in required',
}: RequireAuthProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, user } = useAuth();
  const nextRoute = returnTo ?? pathname;

  if (loading) {
    return (
      <Screen title="Checking session">
        <LoadingState message="Checking your sign-in status..." />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen contentStyle={{ justifyContent: 'center' }}>
        <Card padding="lg" style={{ gap: spacing.lg }} variant="warm">
          <Text accessibilityRole="header" variant="title">
            {title}
          </Text>
          <Text color="muted" variant="body">
            {message}
          </Text>
          <Button
            onPress={() =>
              router.push({
                pathname: '/sign-in',
                params: { returnTo: nextRoute },
              })
            }
            title="Sign in with email"
          />
        </Card>
      </Screen>
    );
  }

  return <>{children}</>;
}
