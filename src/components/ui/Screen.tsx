// src/components/ui/Screen.tsx
import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

import { Text } from './Text';

type ScreenProps = {
  backgroundColor?: string;
  bottomInset?: number;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  subtitle?: string;
  title?: string;
};

export function Screen({
  backgroundColor = colors.background,
  bottomInset = 0,
  children,
  contentStyle,
  scroll,
  subtitle,
  title,
}: ScreenProps) {
  const content = (
    <>
      {title ? (
        <View style={styles.header}>
          <Text accessibilityRole="header" variant="title">
            {title}
          </Text>
          {subtitle ? (
            <Text color="muted" variant="body">
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={bottomInset ? { marginBottom: bottomInset } : undefined}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    maxWidth: 720,
    padding: spacing.xl,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: {
    paddingBottom: 104,
  },
  header: {
    gap: spacing.sm,
  },
});
