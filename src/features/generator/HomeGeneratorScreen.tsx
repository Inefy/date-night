// src/features/generator/HomeGeneratorScreen.tsx
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { DateCardFront } from '@/components/DateCardFront';
import { Button, Card, Chip, EmptyState, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { dateTemplates } from '@/data/dateTemplates';
import { trackDatePlanAnalyticsEvent } from '@/features/analytics/analyticsService';
import { isSupabaseConfigured, useAuth } from '@/features/auth/AuthProvider';
import { getActiveCoupleProfile } from '@/features/couple/coupleService';
import {
  createGeneratedDate,
  listRecentGeneratedTemplateIds,
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
import { formatDuration } from '@/lib/formatters';
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

function getPrimaryVibe(plan: GeneratedDatePlan) {
  return plan.vibeTags[0]?.replaceAll('_', ' ') ?? 'date';
}

function DeckPreview() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.deckPreview}>
      <View style={[styles.deckLayer, styles.deckLayerBack]} />
      <View style={[styles.deckLayer, styles.deckLayerMiddle]} />
      <View style={[styles.deckLayer, styles.deckLayerFront]}>
        <View style={styles.deckChip} />
        <View style={styles.deckLineWide} />
        <View style={styles.deckLine} />
        <View style={styles.deckMetaRow}>
          <View style={styles.deckMetaPill} />
          <View style={styles.deckMetaPillShort} />
        </View>
      </View>
    </View>
  );
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
          ? await listRecentGeneratedTemplateIds({
              coupleId: resolvedCoupleId,
              limit: 5,
            })
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
        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <View style={styles.heroTopRow}>
              <Text color="dustyLavender" variant="overline">
                {getGreeting()}
              </Text>
              <Chip
                label={activeCoupleId ? 'Shared deck' : 'Local deck'}
                tone={activeCoupleId ? 'sage' : 'candlelight'}
              />
            </View>
            <Text color="textInverse" style={styles.heroTitle} variant="display">
              Draw tonight's date
            </Text>
            <Text color="dustyLavender" style={styles.heroSubtitle} variant="body">
              {activeCoupleId
                ? `${activeCoupleName ?? 'Your couple'} deck is ready.`
                : 'Solo setup for now. Add a partner later from the Couple tab.'}
            </Text>
          </View>
          <DeckPreview />
        </View>

        <Card padding="md" style={styles.filterCard} variant="surface">
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
            leftAccessory={<Ionicons color={colors.textInverse} name="sparkles" size={18} />}
            loading={isDrawing}
            onPress={() => void drawDate(true)}
            size="lg"
            title="Draw a Date Card"
          />
          <Button
            disabled={isDrawing}
            fullWidth
            leftAccessory={<Ionicons color={colors.midnightPlum} name="shuffle" size={18} />}
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
  deckChip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.full,
    height: 20,
    width: 58,
  },
  deckLayer: {
    borderRadius: radii.xs,
    position: 'absolute',
  },
  deckLayerBack: {
    backgroundColor: colors.candlelight,
    height: 118,
    right: 8,
    top: 18,
    transform: [{ rotate: '8deg' }],
    width: 86,
  },
  deckLayerFront: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.42)',
    borderWidth: 1,
    gap: spacing.sm,
    height: 124,
    justifyContent: 'flex-end',
    padding: spacing.md,
    right: 22,
    top: 0,
    transform: [{ rotate: '-5deg' }],
    width: 96,
  },
  deckLayerMiddle: {
    backgroundColor: colors.tealSoft,
    height: 120,
    right: 2,
    top: 8,
    transform: [{ rotate: '2deg' }],
    width: 92,
  },
  deckLine: {
    backgroundColor: colors.border,
    borderRadius: radii.full,
    height: 8,
    width: '66%',
  },
  deckLineWide: {
    backgroundColor: colors.midnightPlum,
    borderRadius: radii.full,
    height: 10,
    width: '86%',
  },
  deckMetaPill: {
    backgroundColor: colors.tealSoft,
    borderRadius: radii.full,
    height: 14,
    width: 34,
  },
  deckMetaPillShort: {
    backgroundColor: colors.plumSoft,
    borderRadius: radii.full,
    height: 14,
    width: 26,
  },
  deckMetaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  deckPreview: {
    bottom: -12,
    height: 142,
    opacity: 0.96,
    position: 'absolute',
    right: -2,
    width: 126,
  },
  heroCard: {
    backgroundColor: colors.midnightPlum,
    borderColor: '#3C2A48',
    borderRadius: radii.xs,
    borderWidth: 1,
    minHeight: 260,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  heroCopy: {
    gap: spacing.md,
    zIndex: 1,
  },
  heroSubtitle: {
    maxWidth: 232,
  },
  heroTitle: {
    maxWidth: 292,
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
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
