// src/app/welcome.tsx
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, LoadingState, Screen, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';

export default function WelcomeScreen() {
  const router = useRouter();
  const { loading, user } = useAuth();

  return (
    <Screen contentStyle={styles.content}>
      <Card padding="lg" style={styles.card} variant="elevated">
        <View style={styles.copy}>
          <Text color="accent" variant="overline">
            Date Night Deck
          </Text>
          <Text accessibilityRole="header" variant="display">
            Draw a date now, save the best ones later.
          </Text>
          <Text color="muted" variant="body">
            Guests can use the local generator. Sign in when you want favorites, mystery dates, and couple features.
          </Text>
        </View>

        {loading ? (
          <LoadingState message="Checking your session..." />
        ) : (
          <View style={styles.actions}>
            <Button fullWidth onPress={() => router.push('/onboarding/preferences')} title="Set preferences" />
            <Button fullWidth onPress={() => router.push('/tabs/home')} title="Start local deck" variant="outline" />
            <Button
              fullWidth
              onPress={() => router.push(user ? '/tabs/settings' : '/sign-in')}
              title={user ? 'Account settings' : 'Sign in with email'}
              variant="secondary"
            />
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
  },
  card: {
    gap: spacing.xl,
  },
  content: {
    justifyContent: 'center',
  },
  copy: {
    gap: spacing.md,
  },
});
