// src/features/mystery/LockedMysteryCard.tsx
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button, Card, Chip, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';

type LockedMysteryCardProps = {
  disabled?: boolean;
  onReveal?: () => void;
  revealStyleLabel: string;
  sealStyle?: StyleProp<ViewStyle>;
  teaser: string;
};

export function LockedMysteryCard({
  disabled,
  onReveal,
  revealStyleLabel,
  sealStyle,
  teaser,
}: LockedMysteryCardProps) {
  return (
    <Card
      accessibilityLabel="Locked mystery date card"
      padding="lg"
      style={styles.card}
      variant="elevated"
    >
      <View style={styles.headerRow}>
        <Chip label={revealStyleLabel} tone="candlelight" />
        <Chip label="Locked" tone="lavender" />
      </View>

      <View style={styles.centerpiece}>
        <Animated.View style={[styles.seal, sealStyle]}>
          <View style={styles.sealLine} />
          <Text align="center" color="textInverse" variant="overline">
            Sealed
          </Text>
          <View style={[styles.sealLine, styles.sealLineLower]} />
        </Animated.View>
      </View>

      <View style={styles.copy}>
        <Text color="textInverse" variant="display">
          Mystery card locked
        </Text>
        <Text color="dustyLavender" variant="body">
          {teaser}
        </Text>
      </View>

      {onReveal ? (
        <Button
          accessibilityHint="Reveals the locked date card with a tap."
          accessibilityLabel="Reveal mystery date"
          disabled={disabled}
          fullWidth
          onPress={onReveal}
          size="lg"
          title="Reveal"
          variant="secondary"
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.midnightPlum,
    gap: spacing.xxl,
    overflow: 'hidden',
  },
  centerpiece: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 148,
  },
  copy: {
    gap: spacing.md,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  seal: {
    alignItems: 'center',
    backgroundColor: colors.cranberry,
    borderColor: colors.candlelight,
    borderRadius: radii.full,
    borderWidth: 3,
    height: 116,
    justifyContent: 'center',
    width: 116,
  },
  sealLine: {
    backgroundColor: colors.candlelight,
    height: 3,
    transform: [{ rotate: '-18deg' }],
    width: 72,
  },
  sealLineLower: {
    marginTop: spacing.sm,
    transform: [{ rotate: '18deg' }],
  },
});
