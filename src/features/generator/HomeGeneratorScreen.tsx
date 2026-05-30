// src/features/generator/HomeGeneratorScreen.tsx
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DateCardFront } from '@/components/DateCardFront';
import { Button, Card, Chip, EmptyState, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { dateTemplates } from '@/data/dateTemplates';
import { trackDatePlanAnalyticsEvent } from '@/features/analytics/analyticsService';
import { isSupabaseConfigured, useAuth } from '@/features/auth/AuthProvider';
import { getActiveCoupleProfile } from '@/features/couple/coupleService';
import {
  createGeneratedDate,
  listRecentGeneratedDates,
} from '@/features/generatedDates/generatedDateService';
import {
  getLocalPreferences,
  preferencesToGeneratorFilters,
} from '@/features/preferences/preferencesStorage';
import { generateDatePlan, type DateGenerationFilters } from '@/lib/dateGenerator';
import {
  getCurrentGeneratedDatePlan,
  getRecentGeneratedTemplateIds,
  saveGeneratedDatePlan,
} from '@/lib/generatedDateStore';
import { getOfflineMessage, useNetworkStatus } from '@/lib/networkStatus';
import type { GeneratedDatePlan } from '@/types/domain';

import { GeneratorFilterModal } from './GeneratorFilterModal';
import {
  budgetLabels,
  energyLabels,
  foodLabels,
  locationLabels,
  talkingLabels,
  vibeLabels,
  weatherLabels,
} from './generatorLabels';
import type { GeneratorFilterState } from './generatorTypes';

const shuffleMessages = ['Shuffling the cozy cards...', 'Checking the weather...', "Finding tonight's spark..."];

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

function mapFiltersToGenerator(filters: GeneratorFilterState): DateGenerationFilters {
  return {
    energy: filters.energy,
    foodMode: filters.foodMode,
    locationMode: filters.locationMode,
    maxBudget: filters.maxBudget,
    maxDurationMinutes: filters.maxDurationMinutes,
    noTalking: filters.noTalking,
    rainyDay: filters.rainyDay,
    talkingLevel: filters.talkingLevel,
    vibeTags: filters.vibe ? [filters.vibe] : undefined,
    weatherMode: filters.weatherMode,
  };
}

function getActiveFilterLabels(filters: GeneratorFilterState): string[] {
  return [
    filters.maxBudget ? `Budget: ${budgetLabels[filters.maxBudget]}` : undefined,
    filters.maxDurationMinutes ? `Under ${filters.maxDurationMinutes}m` : undefined,
    filters.locationMode ? locationLabels[filters.locationMode] : undefined,
    filters.energy ? `${energyLabels[filters.energy]} energy` : undefined,
    filters.vibe ? vibeLabels[filters.vibe] ?? filters.vibe : undefined,
    filters.foodMode ? foodLabels[filters.foodMode] : undefined,
    filters.rainyDay ? 'Rainy / indoor' : undefined,
    filters.weatherMode ? weatherLabels[filters.weatherMode] : undefined,
    filters.noTalking ? 'No talking' : undefined,
    filters.talkingLevel ? talkingLabels[filters.talkingLevel] : undefined,
  ].filter((label): label is string => Boolean(label));
}

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes === 0 ? `${hours} hr` : `${hours} hr ${remainingMinutes} min`;
}

function getPrimaryVibe(plan: GeneratedDatePlan) {
  return plan.vibeTags[0]?.replaceAll('_', ' ') ?? 'date';
}

export function HomeGeneratorScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOffline } = useNetworkStatus();
  const [filters, setFilters] = useState<GeneratorFilterState>({});
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [recentPlan, setRecentPlan] = useState(() => getCurrentGeneratedDatePlan());
  const [activeCoupleId, setActiveCoupleId] = useState<string | undefined>();
  const [activeCoupleName, setActiveCoupleName] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [noticeMessage, setNoticeMessage] = useState<string | undefined>();
  const [isDrawing, setIsDrawing] = useState(false);
  const [shuffleIndex, setShuffleIndex] = useState(0);
  const activeFilters = useMemo(() => getActiveFilterLabels(filters), [filters]);

  useEffect(() => {
    let isMounted = true;

    async function loadSavedPreferences() {
      const preferences = await getLocalPreferences();

      if (isMounted) {
        setFilters(preferencesToGeneratorFilters(preferences));
      }
    }

    void loadSavedPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadActiveCouple() {
      if (!user || !isSupabaseConfigured) {
        setActiveCoupleId(undefined);
        setActiveCoupleName(undefined);
        return;
      }

      if (isOffline) {
        return;
      }

      try {
        const couple = await getActiveCoupleProfile(user.id);

        if (isMounted) {
          setActiveCoupleId(couple?.id);
          setActiveCoupleName(couple?.name);
        }
      } catch {
        if (isMounted) {
          setActiveCoupleId(undefined);
          setActiveCoupleName(undefined);
        }
      }
    }

    void loadActiveCouple();

    return () => {
      isMounted = false;
    };
  }, [isOffline, user]);

  async function drawDate(useFilters: boolean) {
    setErrorMessage(undefined);
    setNoticeMessage(undefined);
    setIsDrawing(true);

    try {
      for (let index = 0; index < shuffleMessages.length; index += 1) {
        setShuffleIndex(index);
        await wait(180);
      }

      const generationFilters = useFilters ? mapFiltersToGenerator(filters) : {};
      let resolvedCoupleId = activeCoupleId;

      if (user && !resolvedCoupleId && isSupabaseConfigured && !isOffline) {
        try {
          const couple = await getActiveCoupleProfile(user.id);

          resolvedCoupleId = couple?.id;
          setActiveCoupleId(couple?.id);
          setActiveCoupleName(couple?.name);
        } catch {
          setNoticeMessage('Drawing locally. Couple sync will catch up when the connection is stable.');
        }
      }

      const remoteRecentTemplateIds =
        user && resolvedCoupleId && isSupabaseConfigured && !isOffline
          ? await listRecentGeneratedDates({
              coupleId: resolvedCoupleId,
              limit: 5,
            })
              .then((recentDates) => recentDates.map((generatedDate) => generatedDate.plan.sourceTemplateId))
              .catch(() => [])
          : [];
      const plan = generateDatePlan(generationFilters, dateTemplates, {
        recentlyUsedTemplateIds: [
          ...remoteRecentTemplateIds,
          ...getRecentGeneratedTemplateIds(),
        ],
      });
      let routePlanId = saveGeneratedDatePlan(plan);
      let resultPlan = plan;

      if (user && resolvedCoupleId && isSupabaseConfigured && !isOffline) {
        try {
          const persistedDate = await createGeneratedDate({
            coupleId: resolvedCoupleId,
            filters: generationFilters,
            plan,
            userId: user.id,
          });

          routePlanId = saveGeneratedDatePlan(persistedDate.plan, persistedDate.id);
          resultPlan = persistedDate.plan;
        } catch {
          setNoticeMessage('Date drawn locally. We could not sync it yet, so save or share after reconnecting.');
        }
      } else if (isOffline) {
        setNoticeMessage(getOfflineMessage('sync'));
      }

      setRecentPlan(resultPlan);
      trackDatePlanAnalyticsEvent({
        coupleId: resolvedCoupleId,
        eventName: 'date_generated',
        generatedDateId: routePlanId,
        plan: resultPlan,
        properties: { has_couple: Boolean(resolvedCoupleId) },
        source: useFilters ? 'filtered_draw' : 'surprise_me',
        userId: user?.id,
      });
      router.push({ pathname: '/date/[id]', params: { id: routePlanId } });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The deck could not draw a date right now.');
    } finally {
      setIsDrawing(false);
    }
  }

  return (
    <>
      <Screen bottomInset={64} scroll>
        <View style={styles.hero}>
          <Text color="accent" variant="overline">
            {getGreeting()}
          </Text>
          <Text variant="display">Draw tonight's date</Text>
          <Text color="muted" variant="body">
            {activeCoupleId
              ? `${activeCoupleName ?? 'Your couple'} deck is ready.`
              : 'Solo setup for now. Add a partner later from the Couple tab.'}
          </Text>
        </View>

        <Card padding="lg" style={styles.filterCard} variant="warm">
          <View style={styles.filterHeader}>
            <View style={styles.filterTitle}>
              <Text variant="subtitle">Active filters</Text>
              <Text color="muted" variant="caption">
                Keep it loose or tune the deck.
              </Text>
            </View>
            <Button onPress={() => setFilterModalVisible(true)} size="sm" title="Filters" variant="outline" />
          </View>
          <View style={styles.chipRow}>
            {activeFilters.length > 0 ? (
              activeFilters.map((label) => <Chip key={label} label={label} tone="lavender" />)
            ) : (
              <Chip label="No filters" tone="neutral" />
            )}
          </View>
        </Card>

        <View style={styles.ctaGroup}>
          <Button
            fullWidth
            loading={isDrawing}
            onPress={() => void drawDate(true)}
            size="lg"
            title="Draw a Date Card"
          />
          <Button
            disabled={isDrawing}
            fullWidth
            onPress={() => void drawDate(false)}
            size="lg"
            title="Surprise Me"
            variant="secondary"
          />
        </View>

        {isDrawing ? (
          <Card padding="lg" variant="outlined">
            <LoadingState message={shuffleMessages[shuffleIndex]} />
          </Card>
        ) : null}

        {errorMessage ? (
          <ErrorState
            message={errorMessage}
            onRetry={() => void drawDate(true)}
            retryLabel="Draw again"
            title="The deck needs another shuffle"
          />
        ) : null}

        {noticeMessage ? (
          <Card padding="md" variant="warm">
            <Text color="muted" variant="body">
              {noticeMessage}
            </Text>
          </Card>
        ) : null}

        <View style={styles.section}>
          <Text variant="subtitle">Recent draw</Text>
          {recentPlan ? (
            <DateCardFront
              budgetLabel={recentPlan.estimatedBudgetLabel}
              category={getPrimaryVibe(recentPlan)}
              description={recentPlan.premise}
              durationLabel={formatDuration(recentPlan.estimatedDurationMinutes)}
              title={recentPlan.title}
              vibeLabel={recentPlan.energy}
            />
          ) : (
            <EmptyState
              actionLabel="Draw one"
              message="Your first generated date will appear here as a quick preview."
              onAction={() => void drawDate(true)}
              title="No date drawn yet"
            />
          )}
        </View>
      </Screen>

      <GeneratorFilterModal
        filters={filters}
        onChange={setFilters}
        onClose={() => setFilterModalVisible(false)}
        onReset={() => setFilters({})}
        visible={filterModalVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm,
  },
  filterCard: {
    gap: spacing.lg,
  },
  filterHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
  },
  filterTitle: {
    flex: 1,
    gap: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ctaGroup: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
});
