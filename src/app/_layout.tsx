// src/app/_layout.tsx
import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors, typography } from '@/constants/theme';
import { trackAnalyticsEvent } from '@/features/analytics/analyticsService';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { MysteryLinkHandler } from '@/features/mystery/MysteryLinkHandler';

function AppOpenAnalytics() {
  const { loading, user } = useAuth();
  const tracked = useRef(false);

  useEffect(() => {
    if (loading || tracked.current) {
      return;
    }

    tracked.current = true;
    trackAnalyticsEvent({
      eventName: 'app_opened',
      properties: { source: 'app' },
      userId: user?.id,
    });
  }, [loading, user?.id]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppOpenAnalytics />
      <MysteryLinkHandler />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTitle: 'Date Night Deck',
          headerTitleStyle: {
            color: colors.text,
            fontWeight: typography.fontWeight.bold,
          },
          headerTintColor: colors.text,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ title: 'Welcome' }} />
        <Stack.Screen name="sign-in" options={{ title: 'Sign In' }} />
        <Stack.Screen name="onboarding/preferences" options={{ title: 'Preferences' }} />
        <Stack.Screen name="onboarding/couple-setup" options={{ title: 'Couple Setup' }} />
        <Stack.Screen name="tabs" options={{ headerShown: false }} />
        <Stack.Screen name="date/[id]" options={{ title: 'Date Details' }} />
        <Stack.Screen name="mystery/create" options={{ title: 'Create Mystery Date' }} />
        <Stack.Screen name="mystery/[token]" options={{ title: 'Mystery Date' }} />
      </Stack>
      <StatusBar style="dark" />
    </AuthProvider>
  );
}
