// src/components/ui/SkeletonState.tsx
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

import { Card } from './Card';
import { Text } from './Text';

type SkeletonStateProps = {
  cardCount?: number;
  message?: string;
};

function SkeletonBar({ width }: { width: `${number}%` }) {
  return <View style={[styles.bar, { width }]} />;
}

export function SkeletonState({
  cardCount = 2,
  message = 'Loading...',
}: SkeletonStateProps) {
  return (
    <View accessibilityLabel={message} accessibilityRole="progressbar" style={styles.container}>
      <Text color="muted" variant="body">
        {message}
      </Text>
      {Array.from({ length: cardCount }).map((_, index) => (
        <Card key={index} padding="lg" style={styles.card} variant="outlined">
          <SkeletonBar width="42%" />
          <SkeletonBar width="86%" />
          <SkeletonBar width="68%" />
          <View style={styles.row}>
            <SkeletonBar width="28%" />
            <SkeletonBar width="34%" />
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.border,
    borderRadius: radii.full,
    height: 14,
  },
  card: {
    gap: spacing.md,
  },
  container: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
