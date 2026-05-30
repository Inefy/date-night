// src/components/ScreenPlaceholder.tsx
import { StyleSheet } from 'react-native';

import { Card, Chip, Screen, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import type { PlaceholderScreen } from '@/types/navigation';

export function ScreenPlaceholder({ route, title, subtitle }: PlaceholderScreen) {
  return (
    <Screen contentStyle={{ justifyContent: 'center' }}>
      <Card padding="lg" style={styles.card} variant="warm">
        <Chip label={route} tone="lavender" />
        <Text accessibilityRole="header" variant="display">
          {title}
        </Text>
        {subtitle ? (
          <Text color="muted" variant="body">
            {subtitle}
          </Text>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
});
