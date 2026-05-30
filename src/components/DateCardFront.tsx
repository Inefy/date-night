// src/components/DateCardFront.tsx
import { StyleSheet, View } from 'react-native';

import { Card, Chip, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';

type DateCardFrontProps = {
  budgetLabel?: string;
  category?: string;
  description?: string;
  durationLabel?: string;
  title?: string;
  vibeLabel?: string;
};

export function DateCardFront({
  budgetLabel = '$$',
  category = 'Cozy Night',
  description = 'Set up a small ritual, soften the lights, and choose one easy shared activity.',
  durationLabel = '2 hours',
  title = 'Cozy Reset',
  vibeLabel = 'Low-key',
}: DateCardFrontProps) {
  return (
    <Card
      accessibilityLabel={`Date card front: ${title}`}
      padding="lg"
      style={styles.card}
      variant="elevated"
    >
      <View style={styles.topRow}>
        <Chip label={category} tone="accent" />
        <Text color="muted" variant="caption">
          {durationLabel}
        </Text>
      </View>
      <View style={styles.copy}>
        <Text variant="title">{title}</Text>
        <Text color="muted" variant="body">
          {description}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Text color="midnightPlum" variant="caption">
            {budgetLabel}
          </Text>
        </View>
        <View style={styles.metaPill}>
          <Text color="midnightPlum" variant="caption">
            {vibeLabel}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xl,
    overflow: 'hidden',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  copy: {
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaPill: {
    backgroundColor: colors.candlelight,
    borderRadius: radii.full,
    minHeight: 36,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
