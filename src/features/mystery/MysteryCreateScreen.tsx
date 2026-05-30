// src/features/mystery/MysteryCreateScreen.tsx
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DateCardFront } from '@/components/DateCardFront';
import { Button, Card, Chip, EmptyState, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { trackAnalyticsEvent, trackDatePlanAnalyticsEvent } from '@/features/analytics/analyticsService';
import { isSupabaseConfigured, useAuth } from '@/features/auth/AuthProvider';
import { getActiveCoupleProfile } from '@/features/couple/coupleService';
import type { CoupleProfile } from '@/features/couple/coupleTypes';
import { getGeneratedDateById, isPersistedGeneratedDateId } from '@/features/generatedDates/generatedDateService';
import { energyLabels, vibeLabels } from '@/features/generator/generatorLabels';
import { getGeneratedDatePlan, saveGeneratedDatePlan } from '@/lib/generatedDateStore';
import { getOfflineMessage, useNetworkStatus } from '@/lib/networkStatus';
import type { GeneratedDatePlan, RevealStyle } from '@/types/domain';

import {
  createMysteryDate,
  mysteryRevealStyleOptions,
} from './mysteryService';

type ScreenStatus = 'loading' | 'ready' | 'missing_date' | 'no_couple' | 'error';

function getRouteValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
  const primaryVibe = plan.vibeTags[0];

  return primaryVibe ? vibeLabels[primaryVibe] ?? primaryVibe.replaceAll('_', ' ') : 'Mystery';
}

export function MysteryCreateScreen() {
  const router = useRouter();
  const { loading: authLoading, user } = useAuth();
  const { isOffline } = useNetworkStatus();
  const { dateId } = useLocalSearchParams<{ dateId?: string | string[] }>();
  const routeDateId = getRouteValue(dateId);
  const [status, setStatus] = useState<ScreenStatus>('loading');
  const [coupleProfile, setCoupleProfile] = useState<CoupleProfile | undefined>();
  const [creatorMessage, setCreatorMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isCreating, setIsCreating] = useState(false);
  const [persistedGeneratedDateId, setPersistedGeneratedDateId] = useState<string | undefined>();
  const [plan, setPlan] = useState<GeneratedDatePlan | undefined>();
  const [revealStyle, setRevealStyle] = useState<RevealStyle>('deck_flip');

  useEffect(() => {
    let isMounted = true;

    async function loadMysteryContext() {
      if (authLoading) {
        if (isMounted) {
          setStatus('loading');
        }
        return;
      }

      if (!routeDateId) {
        if (isMounted) {
          setStatus('missing_date');
        }
        return;
      }

      if (!user) {
        return;
      }

      if (!isSupabaseConfigured) {
        if (isMounted) {
          setErrorMessage('Mystery cards need Supabase sync. Add the public Supabase environment variables and try again.');
          setStatus('error');
        }
        return;
      }

      if (isOffline) {
        if (isMounted) {
          setErrorMessage(getOfflineMessage('share'));
          setStatus('error');
        }
        return;
      }

      try {
        const localPlan = getGeneratedDatePlan(routeDateId);
        let resolvedPlan = localPlan;
        let resolvedGeneratedDateId =
          isPersistedGeneratedDateId(routeDateId) ? routeDateId : undefined;

        if (isPersistedGeneratedDateId(routeDateId)) {
          const persistedDate = await getGeneratedDateById(routeDateId);

          if (persistedDate) {
            resolvedPlan = persistedDate.plan;
            resolvedGeneratedDateId = persistedDate.id;
            saveGeneratedDatePlan(persistedDate.plan, persistedDate.id);
          } else if (!resolvedPlan) {
            if (isMounted) {
              setStatus('missing_date');
            }
            return;
          }
        }

        if (!resolvedPlan) {
          if (isMounted) {
            setStatus('missing_date');
          }
          return;
        }

        const activeCouple = await getActiveCoupleProfile(user.id);

        if (!activeCouple) {
          if (isMounted) {
            setPlan(resolvedPlan);
            setPersistedGeneratedDateId(resolvedGeneratedDateId);
            setStatus('no_couple');
          }
          return;
        }

        if (isMounted) {
          setCoupleProfile(activeCouple);
          setErrorMessage(undefined);
          setPersistedGeneratedDateId(resolvedGeneratedDateId);
          setPlan(resolvedPlan);
          setStatus('ready');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Mystery card setup could not load.');
          setStatus('error');
        }
      }
    }

    void loadMysteryContext();

    return () => {
      isMounted = false;
    };
  }, [authLoading, isOffline, routeDateId, user]);

  async function handleCreateMysteryCard() {
    if (!coupleProfile || !plan) {
      setStatus(coupleProfile ? 'missing_date' : 'no_couple');
      return;
    }

    if (isOffline) {
      setErrorMessage(getOfflineMessage('share'));
      return;
    }

    setErrorMessage(undefined);
    setIsCreating(true);

    try {
      const shouldCreateInvite = coupleProfile.members.length < 2;
      const mysteryDate = await createMysteryDate({
        coupleId: coupleProfile.id,
        createInvite: shouldCreateInvite,
        creatorMessage,
        generatedDateId: persistedGeneratedDateId,
        plan,
        revealStyle,
      });

      saveGeneratedDatePlan(plan, mysteryDate.generatedDateId);
      trackDatePlanAnalyticsEvent({
        coupleId: coupleProfile.id,
        eventName: 'mystery_created',
        generatedDateId: mysteryDate.generatedDateId,
        plan,
        properties: {
          partner_pending: shouldCreateInvite,
          reveal_style: revealStyle,
        },
        source: 'mystery_create',
        userId: user?.id,
      });

      if (mysteryDate.inviteToken) {
        trackAnalyticsEvent({
          coupleId: coupleProfile.id,
          eventName: 'invite_created',
          properties: {
            partner_pending: true,
            source: 'mystery_create',
          },
          userId: user?.id,
        });
      }

      router.replace({
        pathname: '/mystery/[token]',
        params: {
          generatedDateId: mysteryDate.generatedDateId,
          invite: mysteryDate.inviteLink,
          token: mysteryDate.token,
        },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Mystery card could not be created.');
    } finally {
      setIsCreating(false);
    }
  }

  if (status === 'loading') {
    return (
      <Screen title="Create Mystery Card">
        <LoadingState message="Preparing the mystery card..." />
      </Screen>
    );
  }

  if (status === 'missing_date' || !plan) {
    return (
      <Screen scroll title="Create Mystery Card">
        <ErrorState
          message="This generated date could not be found. Draw a fresh date card and lock it from the result screen."
          onRetry={() => router.replace('/tabs/home')}
          retryLabel="Back to deck"
          title="Missing generated date"
        />
      </Screen>
    );
  }

  if (status === 'no_couple') {
    return (
      <Screen scroll title="Create Mystery Card">
        <DateCardFront
          budgetLabel={plan.estimatedBudgetLabel}
          category={getPrimaryVibe(plan)}
          description={plan.premise}
          durationLabel={formatDuration(plan.estimatedDurationMinutes)}
          title={plan.title}
          vibeLabel={energyLabels[plan.energy]}
        />
        <EmptyState
          actionLabel="Set up couple deck"
          message="Mystery cards need a couple deck so the locked card can belong to both of you."
          onAction={() => router.push('/onboarding/couple-setup')}
          title="Create a couple first"
        />
      </Screen>
    );
  }

  if (status === 'error') {
    return (
      <Screen scroll title="Create Mystery Card">
        <ErrorState
          message={errorMessage ?? 'Mystery card setup could not load.'}
          onRetry={() => router.replace('/tabs/home')}
          retryLabel="Back to deck"
          title="Mystery setup needs another try"
        />
      </Screen>
    );
  }

  const needsInvite = (coupleProfile?.members.length ?? 0) < 2;

  return (
    <Screen scroll title="Create Mystery Card" subtitle="Lock the plan and choose how it should reveal.">
      <DateCardFront
        budgetLabel={plan.estimatedBudgetLabel}
        category={getPrimaryVibe(plan)}
        description={plan.premise}
        durationLabel={formatDuration(plan.estimatedDurationMinutes)}
        title={plan.title}
        vibeLabel={energyLabels[plan.energy]}
      />

      {needsInvite ? (
        <Card padding="lg" style={styles.section} variant="warm">
          <Text variant="bodyStrong">Partner invite included</Text>
          <Text color="muted" variant="body">
            Your couple deck has one member. This mystery card will include an invite link so your partner can join before opening it.
          </Text>
        </Card>
      ) : null}

      <Card padding="lg" style={styles.section} variant="outlined">
        <Text variant="subtitle">Reveal style</Text>
        <View style={styles.optionList}>
          {mysteryRevealStyleOptions.map((option) => (
            <Card key={option.value} padding="md" style={styles.revealOption} variant="surface">
              <Chip
                label={option.label}
                onPress={() => setRevealStyle(option.value)}
                selected={revealStyle === option.value}
                tone={revealStyle === option.value ? 'accent' : 'neutral'}
              />
              <Text color="muted" variant="body">
                {option.description}
              </Text>
            </Card>
          ))}
        </View>
      </Card>

      <Card padding="lg" style={styles.section} variant="outlined">
        <Text variant="subtitle">Creator message</Text>
        <Text color="muted" variant="body">
          Optional. Keep it short and spoiler-free.
        </Text>
        <TextInput
          accessibilityLabel="Creator message"
          multiline
          onChangeText={setCreatorMessage}
          placeholder="I picked something for us. No peeking."
          placeholderTextColor={colors.muted}
          selectionColor={colors.terracotta}
          style={styles.messageInput}
          value={creatorMessage}
        />
      </Card>

      {errorMessage ? (
        <Text accessibilityRole="alert" color="danger" variant="body">
          {errorMessage}
        </Text>
      ) : null}

      <Button
        fullWidth
        loading={isCreating}
        onPress={() => void handleCreateMysteryCard()}
        size="lg"
        title="Create Mystery Card"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  messageInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 96,
    padding: spacing.lg,
    textAlignVertical: 'top',
  },
  optionList: {
    gap: spacing.md,
  },
  revealOption: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
});
