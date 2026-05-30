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
      <View style={styles.accentRail} />
      <View style={styles.topRow}>
        <Chip label={category} tone="accent" />
        <View style={styles.durationPill}>
          <Text color="accent" variant="caption">
            {durationLabel}
          </Text>
        </View>
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
    backgroundColor: colors.surface,
    gap: spacing.xl,
    overflow: 'hidden',
  },
  accentRail: {
    backgroundColor: colors.accent,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 5,
  },
  durationPill: {
    backgroundColor: colors.surfaceCool,
    borderColor: colors.plumSoft,
    borderRadius: radii.full,
    borderWidth: 1,
    minHeight: 34,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
    backgroundColor: colors.tealSoft,
    borderColor: '#C4E1DA',
    borderRadius: radii.full,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
