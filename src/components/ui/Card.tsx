// src/components/ui/Card.tsx
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';

type CardVariant = 'surface' | 'elevated' | 'outlined' | 'warm';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

type CardProps = ViewProps & {
  children: ReactNode;
  padding?: CardPadding;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
};

export function Card({ children, padding = 'md', style, variant = 'surface', ...props }: CardProps) {
  return (
    <View style={[styles.base, styles[variant], styles[padding], style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderColor: 'transparent',
    borderRadius: radii.xs,
    borderWidth: 1,
  },
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  elevated: {
    backgroundColor: colors.surface,
    borderColor: '#F0E1D4',
    ...shadows.md,
  },
  outlined: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  warm: {
    backgroundColor: colors.surfaceWarm,
    borderColor: '#F2CFA2',
  },
  none: {
    padding: spacing.none,
  },
  sm: {
    padding: spacing.md,
  },
  md: {
    padding: spacing.lg,
  },
  lg: {
    padding: spacing.xl,
  },
});
