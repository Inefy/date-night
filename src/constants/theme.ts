// src/constants/theme.ts
import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  midnightPlum: '#24182E',
  warmCream: '#FFF7ED',
  terracotta: '#E86F4C',
  apricot: '#FFB578',
  sage: '#6F927F',
  dustyLavender: '#B9A2CC',
  candlelight: '#FFE3A3',
  ink: '#2D2633',
  warmGray: '#8A7D83',
  cranberry: '#B94A5A',
  background: '#FFF7ED',
  surface: '#FFFFFF',
  surfaceWarm: '#FFF1E0',
  text: '#2D2633',
  textInverse: '#FFF7ED',
  muted: '#6F6268',
  accent: '#B94A5A',
  accentSoft: '#FFB578',
  success: '#6F927F',
  border: '#EADBCD',
  danger: '#B94A5A',
} as const;

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} satisfies Record<string, NonNullable<TextStyle['fontWeight']>>;

export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 36,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 26,
    xl: 30,
    xxl: 36,
    display: 44,
  },
  fontWeight,
} as const;

export const shadows = {
  none: {},
  sm: {
    shadowColor: colors.midnightPlum,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  md: {
    shadowColor: colors.midnightPlum,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.midnightPlum,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 5,
  },
} as const satisfies Record<string, ViewStyle>;
