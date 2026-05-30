// src/components/ui/Text.tsx
import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text as NativeText,
  type TextProps as NativeTextProps,
  type TextStyle,
} from 'react-native';

import { colors, typography } from '@/constants/theme';

type TextVariant = keyof typeof styles;
type TextColor = keyof typeof colors;

type TextProps = NativeTextProps & {
  align?: TextStyle['textAlign'];
  children: ReactNode;
  color?: TextColor;
  variant?: TextVariant;
};

export function Text({
  align,
  children,
  color = 'text',
  style,
  variant = 'body',
  ...props
}: TextProps) {
  return (
    <NativeText
      maxFontSizeMultiplier={1.4}
      style={[styles[variant], { color: colors[color], textAlign: align }, style]}
      {...props}
    >
      {children}
    </NativeText>
  );
}

const styles = StyleSheet.create({
  display: {
    fontSize: typography.fontSize.display,
    fontWeight: typography.fontWeight.extrabold,
    lineHeight: typography.lineHeight.display,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.xxl,
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.lg,
  },
  body: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.md,
  },
  bodyStrong: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.md,
  },
  caption: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.sm,
  },
  overline: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0,
    lineHeight: typography.lineHeight.xs,
    textTransform: 'uppercase',
  },
});
