// src/components/ui/ErrorState.tsx
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';

import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  title?: string;
};

export function ErrorState({
  message,
  onRetry,
  retryLabel = 'Try again',
  title = 'Something went wrong',
}: ErrorStateProps) {
  return (
    <Card accessibilityRole="alert" padding="lg" style={styles.card} variant="outlined">
      <View style={styles.copy}>
        <Text align="center" color="danger" variant="subtitle">
          {title}
        </Text>
        <Text align="center" color="muted" variant="body">
          {message}
        </Text>
      </View>
      {onRetry ? <Button onPress={onRetry} title={retryLabel} variant="danger" /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  copy: {
    gap: spacing.sm,
  },
});

