// src/components/ui/EmptyState.tsx
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';

import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';

type EmptyStateProps = {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title: string;
};

export function EmptyState({ actionLabel, message, onAction, title }: EmptyStateProps) {
  return (
    <Card padding="lg" style={styles.card} variant="warm">
      <View style={styles.copy}>
        <Text align="center" variant="subtitle">
          {title}
        </Text>
        <Text align="center" color="muted" variant="body">
          {message}
        </Text>
      </View>
      {actionLabel && onAction ? <Button onPress={onAction} title={actionLabel} /> : null}
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

