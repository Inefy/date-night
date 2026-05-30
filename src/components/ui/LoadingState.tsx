// src/components/ui/LoadingState.tsx
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

import { Text } from './Text';

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <View accessibilityLabel={message} accessibilityRole="progressbar" style={styles.container}>
      <ActivityIndicator color={colors.terracotta} size="large" />
      <Text align="center" color="muted" variant="body">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    justifyContent: 'center',
    minHeight: 180,
    padding: spacing.xl,
  },
});

