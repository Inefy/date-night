// src/features/remix/RemixReasonSheet.tsx
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import type { RemixReason } from '@/lib/dateGenerator';

import { getRemixTransitionMessage, remixReasonOptions } from './remixOptions';

type RemixReasonSheetProps = {
  isSubmitting?: boolean;
  onClose: () => void;
  onSelectReason: (reason: RemixReason) => void;
  onSubmit: () => void;
  selectedReason?: RemixReason;
  visible: boolean;
};

export function RemixReasonSheet({
  isSubmitting,
  onClose,
  onSelectReason,
  onSubmit,
  selectedReason,
  visible,
}: RemixReasonSheetProps) {
  const transitionMessage = selectedReason ? getRemixTransitionMessage(selectedReason) : undefined;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close remix reasons"
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text variant="subtitle">Remix this card</Text>
            <Text color="muted" variant="body">
              Pick what missed, and the deck will steer the next draw.
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.reasonGrid}>
              {remixReasonOptions.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  onPress={() => onSelectReason(option.value)}
                  selected={selectedReason === option.value}
                  tone={selectedReason === option.value ? 'accent' : 'neutral'}
                />
              ))}
            </View>

            {transitionMessage ? (
              <Card padding="md" style={styles.messageCard} variant="warm">
                <Text color="muted" variant="body">
                  {transitionMessage}
                </Text>
              </Card>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Button disabled={isSubmitting} onPress={onClose} title="Cancel" variant="ghost" />
            <Button
              disabled={!selectedReason}
              loading={isSubmitting}
              onPress={onSubmit}
              title="Draw remix"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(36, 24, 46, 0.38)',
  },
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: radii.full,
    height: 4,
    marginBottom: spacing.lg,
    width: 48,
  },
  header: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  messageCard: {
    gap: spacing.sm,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '88%',
    paddingTop: spacing.md,
  },
});
