// src/features/preferences/PreferencesScreen.tsx
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { Button, Card, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { trackAnalyticsEvent } from '@/features/analytics/analyticsService';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  budgetOptions,
  durationOptions,
  energyOptions,
  foodOptions,
  locationOptions,
  weatherOptions,
} from '@/features/generator/generatorLabels';

import {
  createDefaultDateNightPreferences,
  defaultDateNightPreferences,
  dietaryPreferenceOptions,
  preferenceVibeOptions,
  type DateNightPreferences,
} from './preferencesTypes';
import {
  getLocalPreferences,
  saveDateNightPreferences,
} from './preferencesStorage';
import {
  validatePreferences,
  type PreferenceValidationErrors,
} from './preferencesValidator';

type OptionValue = string | number;

type PreferenceOption<T extends OptionValue> = {
  label: string;
  value: T;
};

function includesValue<T extends OptionValue>(values: T[], value: T) {
  return values.includes(value);
}

function toggleValue<T extends OptionValue>(values: T[], value: T) {
  return includesValue(values, value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}

function durationBucket(minutes: number) {
  if (minutes <= 60) {
    return 'under_1h';
  }

  if (minutes <= 120) {
    return '1_2h';
  }

  if (minutes <= 180) {
    return '2_3h';
  }

  return '3h_plus';
}

function FieldSection({
  children,
  description,
  error,
  title,
}: {
  children: ReactNode;
  description?: string;
  error?: string;
  title: string;
}) {
  return (
    <Card padding="lg" style={styles.sectionCard} variant="outlined">
      <View style={styles.sectionCopy}>
        <Text variant="subtitle">{title}</Text>
        {description ? (
          <Text color="muted" variant="body">
            {description}
          </Text>
        ) : null}
      </View>
      <View style={styles.optionGrid}>{children}</View>
      {error ? (
        <Text accessibilityRole="alert" color="danger" variant="caption">
          {error}
        </Text>
      ) : null}
    </Card>
  );
}

function SingleSelect<T extends OptionValue>({
  accessibilityGroup,
  onChange,
  options,
  value,
}: {
  accessibilityGroup: string;
  onChange: (value: T) => void;
  options: Array<PreferenceOption<T>>;
  value: T;
}) {
  return options.map((option) => (
    <Pressable
      accessibilityLabel={`${accessibilityGroup}: ${option.label}`}
      accessibilityRole="button"
      accessibilityState={{ selected: value === option.value }}
      key={String(option.value)}
      onPress={() => onChange(option.value)}
      style={({ pressed }) => [
        styles.optionPill,
        value === option.value ? styles.optionPillSelected : undefined,
        pressed ? styles.optionPillPressed : undefined,
      ]}
    >
      <Text color={value === option.value ? 'textInverse' : 'text'} variant="bodyStrong">
        {option.label}
      </Text>
    </Pressable>
  ));
}

function MultiSelect<T extends OptionValue>({
  accessibilityGroup,
  onChange,
  options,
  value,
}: {
  accessibilityGroup: string;
  onChange: (value: T[]) => void;
  options: Array<PreferenceOption<T>>;
  value: T[];
}) {
  return options.map((option) => {
    const selected = includesValue(value, option.value);

    return (
      <Pressable
        accessibilityLabel={`${accessibilityGroup}: ${option.label}`}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        key={String(option.value)}
        onPress={() => onChange(toggleValue(value, option.value))}
        style={({ pressed }) => [
          styles.optionPill,
          selected ? styles.optionPillSelected : undefined,
          pressed ? styles.optionPillPressed : undefined,
        ]}
      >
        <Text color={selected ? 'textInverse' : 'text'} variant="bodyStrong">
          {option.label}
        </Text>
      </Pressable>
    );
  });
}

export function PreferencesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<PreferenceValidationErrors>({});
  const [saveError, setSaveError] = useState<string | undefined>();
  const [saveMessage, setSaveMessage] = useState<string | undefined>();
  const [saveWarning, setSaveWarning] = useState<string | undefined>();
  const { control, handleSubmit, reset } = useForm<DateNightPreferences>({
    defaultValues: createDefaultDateNightPreferences(),
  });

  const destinationCopy = useMemo(() => {
    if (user) {
      return 'We will save these here and sync them to your shared deck when a couple is connected.';
    }

    return 'We will keep these on this device. No account needed.';
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    async function loadPreferences() {
      setLoadingPreferences(true);

      try {
        const preferences = await getLocalPreferences();

        if (isMounted) {
          reset(preferences);
        }
      } finally {
        if (isMounted) {
          setLoadingPreferences(false);
        }
      }
    }

    void loadPreferences();

    return () => {
      isMounted = false;
    };
  }, [reset]);

  async function persistPreferences(preferences: DateNightPreferences) {
    setFormErrors({});
    setSaveError(undefined);
    setSaveMessage(undefined);
    setSaveWarning(undefined);

    const validation = validatePreferences(preferences);

    if (!validation.ok) {
      setFormErrors(validation.errors);
      return;
    }

    setSaving(true);

    try {
      const result = await saveDateNightPreferences(validation.value, user);
      trackAnalyticsEvent({
        eventName: 'onboarding_completed',
        properties: {
          budget_tier: validation.value.defaultBudget,
          duration_bucket: durationBucket(validation.value.defaultDurationMinutes),
          energy: validation.value.defaultEnergy,
          source: 'preferences',
          vibe: validation.value.preferredVibes[0] ?? 'none',
        },
        userId: user?.id,
      });

      if (result.remoteError) {
        setSaveWarning(`Saved on this device. Sync needs another pass: ${result.remoteError}`);
        return;
      }

      setSaveMessage(
        result.coupleSynced
          ? 'Saved to your couple defaults.'
          : user
            ? 'Saved to your profile.'
            : 'Saved on this device.',
      );
      router.replace('/tabs/home');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Preferences could not be saved on this device.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    await persistPreferences(defaultDateNightPreferences);
  }

  if (loadingPreferences) {
    return (
      <Screen title="Preferences">
        <LoadingState message="Setting out the starter deck..." />
      </Screen>
    );
  }

  return (
    <Screen scroll title="Preferences" subtitle="A few gentle defaults. Nothing here is permanent.">
      <Card padding="lg" style={styles.introCard} variant="warm">
        <Text color="accent" variant="overline">
          Low pressure setup
        </Text>
        <Text variant="body">
          Pick the kinds of dates that usually feel easy to say yes to. The deck can still surprise you.
        </Text>
        <Text color="muted" variant="body">
          {destinationCopy}
        </Text>
      </Card>

      <Controller
        control={control}
        name="defaultBudget"
        render={({ field }) => (
          <FieldSection title="Default budget" description="Choose the ceiling that feels comfortable most nights.">
            <SingleSelect
              accessibilityGroup="Default budget"
              onChange={field.onChange}
              options={budgetOptions}
              value={field.value}
            />
          </FieldSection>
        )}
      />

      <Controller
        control={control}
        name="defaultDurationMinutes"
        render={({ field }) => (
          <FieldSection
            error={formErrors.defaultDurationMinutes}
            title="Default duration"
            description="This keeps the first draw realistic before filters get involved."
          >
            <SingleSelect
              accessibilityGroup="Default duration"
              onChange={field.onChange}
              options={durationOptions}
              value={field.value}
            />
          </FieldSection>
        )}
      />

      <Controller
        control={control}
        name="defaultLocationMode"
        render={({ field }) => (
          <FieldSection title="Distance / location" description="The usual starting point for how far the date can roam.">
            <SingleSelect
              accessibilityGroup="Distance or location"
              onChange={field.onChange}
              options={locationOptions}
              value={field.value}
            />
          </FieldSection>
        )}
      />

      <Controller
        control={control}
        name="defaultEnergy"
        render={({ field }) => (
          <FieldSection title="Default energy" description="Set the pace you are most likely to have after a normal day.">
            <SingleSelect
              accessibilityGroup="Default energy"
              onChange={field.onChange}
              options={energyOptions}
              value={field.value}
            />
          </FieldSection>
        )}
      />

      <Controller
        control={control}
        name="preferredVibes"
        render={({ field }) => (
          <FieldSection
            error={formErrors.preferredVibes}
            title="Preferred vibes"
            description="Pick a handful that feel like you. Six or fewer keeps the deck sharp."
          >
            <MultiSelect
              accessibilityGroup="Preferred vibes"
              onChange={field.onChange}
              options={preferenceVibeOptions}
              value={field.value}
            />
          </FieldSection>
        )}
      />

      <Controller
        control={control}
        name="foodPreferences"
        render={({ field }) => (
          <FieldSection
            error={formErrors.foodPreferences}
            title="Food preferences"
            description="Tell the deck how much food should usually be part of the plan."
          >
            <MultiSelect
              accessibilityGroup="Food preferences"
              onChange={field.onChange}
              options={foodOptions}
              value={field.value}
            />
          </FieldSection>
        )}
      />

      <Controller
        control={control}
        name="dietaryPreferences"
        render={({ field }) => (
          <FieldSection title="Dietary preferences" description="Safety stays strict when the generator filters dates.">
            <MultiSelect
              accessibilityGroup="Dietary preferences"
              onChange={field.onChange}
              options={dietaryPreferenceOptions}
              value={field.value}
            />
          </FieldSection>
        )}
      />

      <Controller
        control={control}
        name="rainyIndoorPreference"
        render={({ field }) => (
          <FieldSection title="Rainy / indoor preference" description="Choose how the deck should behave when the weather is unhelpful.">
            <SingleSelect
              accessibilityGroup="Rainy or indoor preference"
              onChange={field.onChange}
              options={weatherOptions}
              value={field.value}
            />
          </FieldSection>
        )}
      />

      {saveWarning ? <ErrorState message={saveWarning} title="Saved locally" /> : null}

      {saveError ? <ErrorState message={saveError} title="Preferences were not saved" /> : null}

      {saveMessage ? (
        <Card padding="md" variant="warm">
          <Text color="success" variant="bodyStrong">
            {saveMessage}
          </Text>
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button
          disabled={saving}
          onPress={() => void handleSkip()}
          title="Skip for now"
          variant="ghost"
        />
        <Button
          loading={saving}
          onPress={handleSubmit((values) => void persistPreferences(values))}
          title="Save and continue"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  introCard: {
    gap: spacing.md,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionPill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: radii.full,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  optionPillPressed: {
    opacity: 0.76,
  },
  optionPillSelected: {
    backgroundColor: colors.midnightPlum,
    borderColor: colors.midnightPlum,
  },
  sectionCard: {
    gap: spacing.lg,
  },
  sectionCopy: {
    gap: spacing.sm,
  },
});
