// src/components/ui/Button.tsx
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  fullWidth?: boolean;
  leftAccessory?: ReactNode;
  loading?: boolean;
  rightAccessory?: ReactNode;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  title: string;
  variant?: ButtonVariant;
};

const textColors: Record<ButtonVariant, keyof typeof colors> = {
  primary: 'midnightPlum',
  secondary: 'text',
  outline: 'accent',
  ghost: 'accent',
  danger: 'textInverse',
};

export function Button({
  accessibilityLabel,
  disabled,
  fullWidth,
  leftAccessory,
  loading,
  rightAccessory,
  size = 'md',
  style,
  title,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);
  const labelColor = textColors[variant];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        fullWidth ? styles.fullWidth : undefined,
        pressed && !isDisabled ? styles.pressed : undefined,
        isDisabled ? styles.disabled : undefined,
        style,
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator color={colors[labelColor]} /> : leftAccessory}
      <Text align="center" color={labelColor} style={styles.label} variant="bodyStrong">
        {title}
      </Text>
      {rightAccessory}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  label: {
    flexShrink: 1,
  },
  sm: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  md: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
  },
  lg: {
    minHeight: 56,
    paddingHorizontal: spacing.xxl,
  },
  primary: {
    backgroundColor: colors.terracotta,
  },
  secondary: {
    backgroundColor: colors.candlelight,
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.terracotta,
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.cranberry,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.48,
  },
});
