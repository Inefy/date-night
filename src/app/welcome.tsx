// src/app/welcome.tsx
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, LoadingState, Screen, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';

function WelcomeCardStack() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.stackWrap}>
      <View style={[styles.stackCard, styles.stackCardBack]} />
      <View style={[styles.stackCard, styles.stackCardMiddle]} />
      <View style={[styles.stackCard, styles.stackCardFront]}>
        <View style={styles.stackTag} />
        <View style={styles.stackTitle} />
        <View style={styles.stackLine} />
        <View style={styles.stackLineShort} />
      </View>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const { loading, user } = useAuth();

  return (
    <Screen contentStyle={styles.content}>
      <Card padding="lg" style={styles.card} variant="elevated">
        <WelcomeCardStack />
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
    backgroundColor: colors.surface,
    gap: spacing.xl,
  },
  content: {
    justifyContent: 'center',
  },
  copy: {
    gap: spacing.md,
  },
  stackCard: {
    borderRadius: radii.xs,
    position: 'absolute',
  },
  stackCardBack: {
    backgroundColor: colors.tealSoft,
    height: 122,
    left: 28,
    top: 12,
    transform: [{ rotate: '-7deg' }],
    width: 94,
  },
  stackCardFront: {
    backgroundColor: colors.midnightPlum,
    gap: spacing.sm,
    height: 128,
    justifyContent: 'flex-end',
    left: 54,
    padding: spacing.md,
    top: 0,
    transform: [{ rotate: '5deg' }],
    width: 100,
  },
  stackCardMiddle: {
    backgroundColor: colors.candlelight,
    height: 124,
    left: 42,
    top: 8,
    width: 98,
  },
  stackLine: {
    backgroundColor: 'rgba(255, 253, 251, 0.82)',
    borderRadius: radii.full,
    height: 8,
    width: '82%',
  },
  stackLineShort: {
    backgroundColor: 'rgba(188, 167, 217, 0.9)',
    borderRadius: radii.full,
    height: 8,
    width: '60%',
  },
  stackTag: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.full,
    height: 18,
    width: 58,
  },
  stackTitle: {
    backgroundColor: colors.textInverse,
    borderRadius: radii.full,
    height: 10,
    width: '92%',
  },
  stackWrap: {
    alignSelf: 'center',
    height: 146,
    width: 184,
  },
});
