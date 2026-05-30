// src/components/ui/Chip.tsx
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

import { Text } from './Text';

type ChipTone = 'neutral' | 'accent' | 'sage' | 'lavender' | 'candlelight';

type ChipProps = {
  accessibilityLabel?: string;
  label: string;
  onPress?: PressableProps['onPress'];
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  tone?: ChipTone;
};

const toneStyles: Record<ChipTone, { backgroundColor: string; color: keyof typeof colors }> = {
  neutral: { backgroundColor: colors.surfaceWarm, color: 'text' },
  accent: { backgroundColor: colors.accentSoft, color: 'midnightPlum' },
  sage: { backgroundColor: colors.tealSoft, color: 'teal' },
  lavender: { backgroundColor: colors.plumSoft, color: 'midnightPlum' },
  candlelight: { backgroundColor: colors.candlelight, color: 'text' },
};

export function Chip({
  accessibilityLabel,
  label,
  onPress,
  selected,
  style,
  tone = 'neutral',
}: ChipProps) {
  const palette = toneStyles[tone];
  const chipStyle = [
    styles.base,
    { backgroundColor: palette.backgroundColor },
    selected ? styles.selected : undefined,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [chipStyle, pressed ? styles.pressed : undefined]}
      >
        <Text color={palette.color} variant="caption">
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View accessibilityLabel={accessibilityLabel ?? label} style={chipStyle}>
      <Text color={palette.color} variant="caption">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: 'transparent',
    borderWidth: 1,
    borderRadius: radii.full,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  selected: {
    borderColor: colors.midnightPlum,
  },
  pressed: {
    opacity: 0.76,
  },
});
