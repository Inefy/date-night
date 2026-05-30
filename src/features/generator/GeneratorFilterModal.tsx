// src/features/generator/GeneratorFilterModal.tsx
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Chip, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';

import {
  budgetOptions,
  durationOptions,
  energyOptions,
  foodOptions,
  locationOptions,
  talkingOptions,
  vibeOptions,
  weatherOptions,
} from './generatorLabels';
import type { GeneratorFilterState } from './generatorTypes';

type GeneratorFilterModalProps = {
  filters: GeneratorFilterState;
  onChange: (filters: GeneratorFilterState) => void;
  onClose: () => void;
  onReset: () => void;
  visible: boolean;
};

type FilterOption<T extends string | number> = {
  label: string;
  value: T;
};

function toggleValue<T>(current: T | undefined, value: T): T | undefined {
  return current === value ? undefined : value;
}

function FilterSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text variant="bodyStrong">{title}</Text>
      <View style={styles.chipGrid}>{children}</View>
    </View>
  );
}

function OptionChips<T extends string | number>({
  onSelect,
  options,
  value,
}: {
  onSelect: (value: T) => void;
  options: Array<FilterOption<T>>;
  value?: T;
}) {
  return options.map((option) => (
    <Chip
      key={String(option.value)}
      label={option.label}
      onPress={() => onSelect(option.value)}
      selected={value === option.value}
      tone={value === option.value ? 'accent' : 'neutral'}
    />
  ));
}

export function GeneratorFilterModal({
  filters,
  onChange,
  onClose,
  onReset,
  visible,
}: GeneratorFilterModalProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close filters"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text variant="subtitle">Tune the deck</Text>
              <Text color="muted" variant="caption">
                Filters are optional. Dietary safety stays strict in the generator.
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
            <FilterSection title="Budget">
              <OptionChips
                onSelect={(maxBudget) => onChange({ ...filters, maxBudget: toggleValue(filters.maxBudget, maxBudget) })}
                options={budgetOptions}
                value={filters.maxBudget}
              />
            </FilterSection>

            <FilterSection title="Duration">
              <OptionChips
                onSelect={(maxDurationMinutes) =>
                  onChange({
                    ...filters,
                    maxDurationMinutes: toggleValue(filters.maxDurationMinutes, maxDurationMinutes),
                  })
                }
                options={durationOptions}
                value={filters.maxDurationMinutes}
              />
            </FilterSection>

            <FilterSection title="Distance / location">
              <OptionChips
                onSelect={(locationMode) =>
                  onChange({ ...filters, locationMode: toggleValue(filters.locationMode, locationMode) })
                }
                options={locationOptions}
                value={filters.locationMode}
              />
            </FilterSection>

            <FilterSection title="Energy">
              <OptionChips
                onSelect={(energy) => onChange({ ...filters, energy: toggleValue(filters.energy, energy) })}
                options={energyOptions}
                value={filters.energy}
              />
            </FilterSection>

            <FilterSection title="Vibe">
              <OptionChips
                onSelect={(vibe) => onChange({ ...filters, vibe: toggleValue(filters.vibe, vibe) })}
                options={vibeOptions}
                value={filters.vibe}
              />
            </FilterSection>

            <FilterSection title="Food mode">
              <OptionChips
                onSelect={(foodMode) => onChange({ ...filters, foodMode: toggleValue(filters.foodMode, foodMode) })}
                options={foodOptions}
                value={filters.foodMode}
              />
            </FilterSection>

            <FilterSection title="Weather mode">
              <OptionChips
                onSelect={(weatherMode) =>
                  onChange({
                    ...filters,
                    rainyDay: false,
                    weatherMode: toggleValue(filters.weatherMode, weatherMode),
                  })
                }
                options={weatherOptions}
                value={filters.weatherMode}
              />
              <Chip
                label="Rainy / indoor"
                onPress={() =>
                  onChange({
                    ...filters,
                    rainyDay: !filters.rainyDay,
                    weatherMode: filters.rainyDay ? filters.weatherMode : undefined,
                  })
                }
                selected={filters.rainyDay}
                tone={filters.rainyDay ? 'sage' : 'neutral'}
              />
            </FilterSection>

            <FilterSection title="Talking level">
              <OptionChips
                onSelect={(talkingLevel) =>
                  onChange({
                    ...filters,
                    noTalking: false,
                    talkingLevel: toggleValue(filters.talkingLevel, talkingLevel),
                  })
                }
                options={talkingOptions}
                value={filters.talkingLevel}
              />
              <Chip
                label="No talking"
                onPress={() =>
                  onChange({
                    ...filters,
                    noTalking: !filters.noTalking,
                    talkingLevel: filters.noTalking ? filters.talkingLevel : undefined,
                  })
                }
                selected={filters.noTalking}
                tone={filters.noTalking ? 'sage' : 'neutral'}
              />
            </FilterSection>
          </ScrollView>

          <View style={styles.actions}>
            <Button onPress={onReset} style={styles.actionButton} title="Reset" variant="ghost" />
            <Button onPress={onClose} style={styles.actionButton} title="Apply filters" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(36, 24, 46, 0.38)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '88%',
    paddingTop: spacing.md,
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
    paddingHorizontal: spacing.xl,
  },
  content: {
    gap: spacing.xl,
    padding: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
});
