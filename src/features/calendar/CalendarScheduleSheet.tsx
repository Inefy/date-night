// src/features/calendar/CalendarScheduleSheet.tsx
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import type { GeneratedDatePlan } from '@/types/domain';

import type { CalendarScheduleInput } from './calendarService';
import {
  formatDateInput,
  formatTimeInput,
  getDefaultStartAt,
  parseSchedule,
} from './calendarSchedule';

type CalendarScheduleSheetProps = {
  copyMessage?: string;
  errorMessage?: string;
  isCopying?: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onCopyPlan: () => void;
  onSubmit: (schedule: CalendarScheduleInput) => void;
  plan: GeneratedDatePlan;
  showCopyPlan?: boolean;
  visible: boolean;
};

function Field({
  accessibilityLabel,
  keyboardType,
  label,
  onChangeText,
  placeholder,
  value,
}: {
  accessibilityLabel: string;
  keyboardType?: 'default' | 'number-pad';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text color="muted" variant="caption">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        selectionColor={colors.terracotta}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

export function CalendarScheduleSheet({
  copyMessage,
  errorMessage,
  isCopying,
  isSubmitting,
  onClose,
  onCopyPlan,
  onSubmit,
  plan,
  showCopyPlan,
  visible,
}: CalendarScheduleSheetProps) {
  const [dateValue, setDateValue] = useState('');
  const [durationValue, setDurationValue] = useState('');
  const [localError, setLocalError] = useState<string | undefined>();
  const [timeValue, setTimeValue] = useState('');
  const [titleValue, setTitleValue] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }

    const defaultStartAt = getDefaultStartAt();

    setDateValue(formatDateInput(defaultStartAt));
    setDurationValue(String(plan.estimatedDurationMinutes));
    setLocalError(undefined);
    setTimeValue(formatTimeInput(defaultStartAt));
    setTitleValue(plan.calendarTitle);
  }, [plan.calendarTitle, plan.estimatedDurationMinutes, visible]);

  function handleSubmit() {
    const parsed = parseSchedule({
      dateValue,
      durationValue,
      timeValue,
      titleValue,
    });

    if (parsed.error || !parsed.schedule) {
      setLocalError(parsed.error ?? 'Check the schedule details.');
      return;
    }

    setLocalError(undefined);
    onSubmit(parsed.schedule);
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close calendar scheduling"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text variant="subtitle">Add to calendar</Text>
            <Text color="muted" variant="caption">
              Schedule the date and keep the plan in the event notes.
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Field
              accessibilityLabel="Calendar event title"
              label="Title"
              onChangeText={setTitleValue}
              placeholder="Date night title"
              value={titleValue}
            />

            <View style={styles.twoColumn}>
              <Field
                accessibilityLabel="Calendar event date"
                label="Date"
                onChangeText={setDateValue}
                placeholder="YYYY-MM-DD"
                value={dateValue}
              />
              <Field
                accessibilityLabel="Calendar event start time"
                label="Start time"
                onChangeText={setTimeValue}
                placeholder="19:00"
                value={timeValue}
              />
            </View>

            <Field
              accessibilityLabel="Calendar event duration in minutes"
              keyboardType="number-pad"
              label="Duration"
              onChangeText={setDurationValue}
              placeholder="120"
              value={durationValue}
            />

            {localError || errorMessage ? (
              <Text accessibilityRole="alert" color="danger" variant="body">
                {localError ?? errorMessage}
              </Text>
            ) : null}

            {showCopyPlan ? (
              <Card padding="md" style={styles.copyCard} variant="warm">
                <Text variant="bodyStrong">Calendar permission was not granted.</Text>
                <Text color="muted" variant="body">
                  Copy the full plan and paste it into any calendar note.
                </Text>
                {copyMessage ? (
                  <Text color="success" variant="bodyStrong">
                    {copyMessage}
                  </Text>
                ) : null}
                <Button
                  loading={isCopying}
                  onPress={onCopyPlan}
                  title="Copy Plan"
                  variant="secondary"
                />
              </Card>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Button disabled={isSubmitting} onPress={onClose} title="Cancel" variant="ghost" />
            <Button loading={isSubmitting} onPress={handleSubmit} title="Create event" />
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
  copyCard: {
    gap: spacing.md,
  },
  fieldGroup: {
    flex: 1,
    gap: spacing.sm,
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
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '88%',
    paddingTop: spacing.md,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
