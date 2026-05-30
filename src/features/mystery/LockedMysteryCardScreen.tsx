// src/features/mystery/LockedMysteryCardScreen.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DatePlanView } from '@/components/DatePlanView';
import { Button, Card, EmptyState, ErrorState, Screen, SkeletonState, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { trackAnalyticsEvent, trackDatePlanAnalyticsEvent } from '@/features/analytics/analyticsService';
import { isSupabaseConfigured, useAuth } from '@/features/auth/AuthProvider';
import { CalendarScheduleSheet } from '@/features/calendar/CalendarScheduleSheet';
import {
  copyPlanToClipboard,
  createDateNightCalendarEvent,
  saveCalendarEventMetadata,
  type CalendarScheduleInput,
} from '@/features/calendar/calendarService';
import { acceptCoupleInvite } from '@/features/couple/coupleService';
import { saveFavorite } from '@/features/favorites/favoritesService';
import { getOfflineMessage, useNetworkStatus } from '@/lib/networkStatus';
import type { GeneratedDatePlan } from '@/types/domain';

import { LockedMysteryCard } from './LockedMysteryCard';
import { MysteryRevealAnimation } from './MysteryRevealAnimation';
import {
  buildMysteryLink,
  copyMysteryLink,
  getMysteryGeneratedPlan,
  isValidMysteryToken,
  mysteryRevealStyleLabels,
  parseMysteryLink,
  resolveMysteryDateAccess,
  revealMysteryDate,
  shareMysteryCard,
  type ResolvedMysteryDateAccess,
} from './mysteryService';

type ScreenStatus = 'loading' | 'ready' | 'error';

function getRouteValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getDefaultDisplayName(email?: string) {
  const emailName = email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim();

  return emailName && emailName.length > 0 ? emailName : 'Date Night Partner';
}

function getMysteryRoute(token?: string) {
  return token ? `/mystery/${encodeURIComponent(token)}` : '/tabs/home';
}

function LockedMetadata({
  access,
}: {
  access: ResolvedMysteryDateAccess;
}) {
  const mysteryDate = access.mysteryDate;

  if (!mysteryDate) {
    return null;
  }

  return (
    <LockedMysteryCard
      revealStyleLabel={mysteryRevealStyleLabels[mysteryDate.revealStyle]}
      teaser={mysteryDate.teaser}
    />
  );
}

function ActionMessage({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <Card accessibilityRole="alert" padding="md" variant="warm">
      <Text color="muted" variant="body">
        {message}
      </Text>
    </Card>
  );
}

function RevealedPlanDetails({ plan }: { plan: GeneratedDatePlan }) {
  return (
    <Card padding="lg" style={styles.section} variant="outlined">
      <Text variant="subtitle">Plan details</Text>
      <View style={styles.detailGroup}>
        <Text color="muted" variant="overline">
          Food plan
        </Text>
        <Text variant="body">{plan.foodPlan}</Text>
      </View>
      <View style={styles.detailGroup}>
        <Text color="muted" variant="overline">
          Prep list
        </Text>
        {plan.prepItems.map((item) => (
          <Text key={item} color="muted" variant="body">
            - {item}
          </Text>
        ))}
      </View>
      <View style={styles.detailGroup}>
        <Text color="muted" variant="overline">
          Twist
        </Text>
        <Text variant="body">{plan.twist}</Text>
      </View>
      <View style={styles.detailGroup}>
        <Text color="muted" variant="overline">
          Conversation
        </Text>
        <Text variant="body">{plan.conversationPrompt}</Text>
      </View>
      <View style={styles.detailGroup}>
        <Text color="muted" variant="overline">
          Backup plan
        </Text>
        <Text variant="body">{plan.backupPlan}</Text>
      </View>
    </Card>
  );
}

export function LockedMysteryCardScreen() {
  const router = useRouter();
  const { loading: authLoading, user } = useAuth();
  const { isOffline } = useNetworkStatus();
  const { token } = useLocalSearchParams<{
    token?: string | string[];
  }>();
  const rawMysteryToken = getRouteValue(token);
  const mysteryToken = rawMysteryToken ? parseMysteryLink(rawMysteryToken)?.token ?? rawMysteryToken : undefined;
  const mysteryLink = mysteryToken ? buildMysteryLink(mysteryToken) : undefined;
  const defaultDisplayName = useMemo(() => getDefaultDisplayName(user?.email), [user?.email]);
  const openedAnalyticsKeys = useRef<Set<string>>(new Set());
  const [access, setAccess] = useState<ResolvedMysteryDateAccess | undefined>();
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const [calendarCopyMessage, setCalendarCopyMessage] = useState<string | undefined>();
  const [calendarErrorMessage, setCalendarErrorMessage] = useState<string | undefined>();
  const [calendarSheetVisible, setCalendarSheetVisible] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | undefined>();
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [hasRevealedPlan, setHasRevealedPlan] = useState(false);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [isCopyingPlan, setIsCopyingPlan] = useState(false);
  const [isFavoriteSaved, setIsFavoriteSaved] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [plan, setPlan] = useState<GeneratedDatePlan | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCopyPlan, setShowCopyPlan] = useState(false);
  const [status, setStatus] = useState<ScreenStatus>('loading');

  useEffect(() => {
    setDisplayName(defaultDisplayName);
  }, [defaultDisplayName]);

  useEffect(() => {
    let isMounted = true;

    async function loadMysteryDate() {
      if (authLoading) {
        if (isMounted) {
          setStatus('loading');
        }
        return;
      }

      setActionMessage(undefined);
      setCalendarCopyMessage(undefined);
      setCalendarErrorMessage(undefined);
      setCopyMessage(undefined);
      setErrorMessage(undefined);
      setHasRevealedPlan(false);
      setIsFavoriteSaved(false);
      setPlan(undefined);
      setShowCopyPlan(false);

      if (!mysteryToken || !isValidMysteryToken(mysteryToken)) {
        if (isMounted) {
          setAccess({ status: 'invalid' });
          setStatus('ready');
        }
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
          setErrorMessage(getOfflineMessage('reveal'));
          setStatus('error');
        }
        return;
      }

      try {
        const resolvedAccess = await resolveMysteryDateAccess(mysteryToken);
        let analyticsPlan: GeneratedDatePlan | undefined;

        if (!isMounted) {
          return;
        }

        setAccess(resolvedAccess);

        if (
          user &&
          resolvedAccess.mysteryDate &&
          (resolvedAccess.status === 'locked' || resolvedAccess.status === 'revealed')
        ) {
          const persistedDate = await getMysteryGeneratedPlan(resolvedAccess.mysteryDate.generatedDateId);

          if (!isMounted) {
            return;
          }

          if (!persistedDate) {
            setErrorMessage('The generated plan for this mystery card could not be found.');
            setStatus('error');
            return;
          }

          setPlan(persistedDate.plan);
          analyticsPlan = persistedDate.plan;
          setHasRevealedPlan(resolvedAccess.status === 'revealed');
        }

        trackMysteryOpened(resolvedAccess, analyticsPlan);
        setStatus('ready');
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Mystery card could not be loaded.');
          setStatus('error');
        }
      }
    }

    void loadMysteryDate();

    return () => {
      isMounted = false;
    };
  }, [authLoading, isOffline, mysteryToken, refreshKey, user]);

  function trackMysteryOpened(
    resolvedAccess: ResolvedMysteryDateAccess,
    analyticsPlan?: GeneratedDatePlan,
  ) {
    const analyticsKey = `${mysteryToken ?? 'unknown'}:${user?.id ?? 'guest'}:${resolvedAccess.status}`;

    if (openedAnalyticsKeys.current.has(analyticsKey)) {
      return;
    }

    openedAnalyticsKeys.current.add(analyticsKey);

    if (analyticsPlan) {
      trackDatePlanAnalyticsEvent({
        coupleId: resolvedAccess.mysteryDate?.coupleId,
        eventName: 'mystery_opened',
        generatedDateId: resolvedAccess.mysteryDate?.generatedDateId,
        plan: analyticsPlan,
        properties: { status: resolvedAccess.status },
        source: 'mystery_link',
        userId: user?.id,
      });
      return;
    }

    trackAnalyticsEvent({
      coupleId: resolvedAccess.mysteryDate?.coupleId,
      eventName: 'mystery_opened',
      properties: {
        source: 'mystery_link',
        status: resolvedAccess.status,
      },
      userId: user?.id,
    });
  }

  async function handleShare() {
    if (!mysteryToken) {
      return;
    }

    if (isOffline) {
      setErrorMessage(getOfflineMessage('share'));
      return;
    }

    setIsSharing(true);
    setCopyMessage(undefined);
    setErrorMessage(undefined);

    try {
      await shareMysteryCard({
        token: mysteryToken,
      });
      setCopyMessage('Share sheet opened.');
      trackAnalyticsEvent({
        coupleId: access?.mysteryDate?.coupleId,
        eventName: 'mystery_shared',
        generatedDateId: access?.mysteryDate?.generatedDateId,
        properties: { source: 'native_share' },
        userId: user?.id,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The mystery card could not be shared. Copy the link instead.');
    } finally {
      setIsSharing(false);
    }
  }

  async function handleCopyLink() {
    if (!mysteryToken) {
      return;
    }

    setCopyMessage(undefined);
    setErrorMessage(undefined);
    setIsCopyingLink(true);

    try {
      await copyMysteryLink(mysteryToken);
      setCopyMessage('Mystery link copied.');
      trackAnalyticsEvent({
        coupleId: access?.mysteryDate?.coupleId,
        eventName: 'mystery_shared',
        generatedDateId: access?.mysteryDate?.generatedDateId,
        properties: { source: 'copy_link' },
        userId: user?.id,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The mystery link could not be copied.');
    } finally {
      setIsCopyingLink(false);
    }
  }

  function handleSignIn() {
    router.push({
      pathname: '/sign-in',
      params: { returnTo: getMysteryRoute(mysteryToken) },
    });
  }

  async function handleJoinCouple() {
    if (!access?.inviteToken || !user) {
      setActionMessage('Sign in before joining this couple deck.');
      return;
    }

    if (isOffline) {
      setActionMessage(getOfflineMessage('join'));
      return;
    }

    setActionMessage(undefined);
    setIsJoining(true);

    try {
      const acceptedInvite = await acceptCoupleInvite({
        displayName,
        rawInviteToken: access.inviteToken,
        userId: user.id,
      });
      trackAnalyticsEvent({
        coupleId: acceptedInvite.couple_id,
        eventName: 'invite_accepted',
        properties: { source: 'mystery_link' },
        userId: user.id,
      });
      setActionMessage('Joined. Opening the locked card now.');
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'This invite could not be accepted.');
    } finally {
      setIsJoining(false);
    }
  }

  async function handleReveal() {
    if (!mysteryToken) {
      throw new Error('This mystery link is invalid.');
    }

    if (isOffline) {
      throw new Error(getOfflineMessage('reveal'));
    }

    const revealedMysteryDate = await revealMysteryDate(mysteryToken);
    if (plan) {
      trackDatePlanAnalyticsEvent({
        coupleId: revealedMysteryDate.coupleId,
        eventName: 'mystery_revealed',
        generatedDateId: revealedMysteryDate.generatedDateId,
        plan,
        source: 'mystery_link',
        userId: user?.id,
      });
    }

    setAccess((currentAccess) =>
      currentAccess
        ? {
            ...currentAccess,
            mysteryDate: revealedMysteryDate,
            status: currentAccess.status === 'locked' ? 'locked' : 'revealed',
          }
        : currentAccess,
    );
  }

  async function handleSave() {
    if (!plan || !access?.mysteryDate) {
      setActionMessage('The date plan is not ready yet.');
      return;
    }

    if (!user) {
      setActionMessage('Sign in to save this mystery date.');
      handleSignIn();
      return;
    }

    if (!isSupabaseConfigured) {
      setActionMessage('Favorites need Supabase sync. Add the public Supabase environment variables and try again.');
      return;
    }

    if (isOffline) {
      setActionMessage(getOfflineMessage('save'));
      return;
    }

    setActionMessage(undefined);
    setIsSavingFavorite(true);

    try {
      await saveFavorite({
        generatedDateId: access.mysteryDate.generatedDateId,
        plan,
        userId: user.id,
      });
      setIsFavoriteSaved(true);
      setActionMessage('Saved to Favorites.');
      trackDatePlanAnalyticsEvent({
        coupleId: access.mysteryDate.coupleId,
        eventName: 'date_saved',
        generatedDateId: access.mysteryDate.generatedDateId,
        plan,
        source: 'mystery_reveal',
        userId: user.id,
      });
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Favorites could not be updated right now.');
    } finally {
      setIsSavingFavorite(false);
    }
  }

  function handleAddToCalendar() {
    setActionMessage(undefined);
    setCalendarCopyMessage(undefined);
    setCalendarErrorMessage(undefined);
    setShowCopyPlan(false);
    setCalendarSheetVisible(true);
    if (plan) {
      trackDatePlanAnalyticsEvent({
        coupleId: access?.mysteryDate?.coupleId,
        eventName: 'calendar_add_started',
        generatedDateId: access?.mysteryDate?.generatedDateId,
        plan,
        source: 'mystery_reveal',
        userId: user?.id,
      });
    }
  }

  async function handleCreateCalendarEvent(schedule: CalendarScheduleInput) {
    if (!plan || !access?.mysteryDate) {
      setCalendarErrorMessage('Date plan not found.');
      return;
    }

    setCalendarCopyMessage(undefined);
    setCalendarErrorMessage(undefined);
    setIsAddingToCalendar(true);
    setShowCopyPlan(false);

    try {
      const result = await createDateNightCalendarEvent(plan, schedule);

      if (result.status === 'blocked') {
        setShowCopyPlan(true);
        setCalendarErrorMessage(
          result.reason === 'permission_denied'
            ? 'Calendar permission was not granted. Copy the plan instead.'
            : 'Device calendar is not available here. Copy the plan instead.',
        );
        trackDatePlanAnalyticsEvent({
          coupleId: access.mysteryDate.coupleId,
          eventName: 'calendar_add_failed',
          generatedDateId: access.mysteryDate.generatedDateId,
          plan,
          properties: { failure_reason: result.reason },
          source: 'mystery_reveal',
          userId: user?.id,
        });
        return;
      }

      let metadataWarning: string | undefined;

      if (user && isSupabaseConfigured && !isOffline) {
        try {
          await saveCalendarEventMetadata({
            calendarId: result.event.calendarId,
            coupleId: access.mysteryDate.coupleId,
            description: result.event.notes,
            endsAt: result.event.endAt,
            eventId: result.event.eventId,
            generatedDateId: access.mysteryDate.generatedDateId,
            provider: result.event.provider,
            startsAt: result.event.startAt,
            title: result.event.title,
            userId: user.id,
          });
        } catch (error) {
          metadataWarning =
            error instanceof Error
              ? `Added to calendar. Sync note: ${error.message}`
              : 'Added to calendar, but sync metadata could not be saved.';
        }
      }

      setCalendarSheetVisible(false);
      setActionMessage(
        metadataWarning ??
          (isOffline
            ? 'Added to your device calendar. Sync metadata was skipped while offline.'
            : 'Added to your device calendar.'),
      );
      trackDatePlanAnalyticsEvent({
        coupleId: access.mysteryDate.coupleId,
        eventName: 'calendar_add_completed',
        generatedDateId: access.mysteryDate.generatedDateId,
        plan,
        source: 'mystery_reveal',
        userId: user?.id,
      });
    } catch (error) {
      setCalendarErrorMessage(error instanceof Error ? error.message : 'Calendar could not be updated right now.');
      trackDatePlanAnalyticsEvent({
        coupleId: access.mysteryDate.coupleId,
        eventName: 'calendar_add_failed',
        generatedDateId: access.mysteryDate.generatedDateId,
        plan,
        properties: { failure_reason: 'create_failed' },
        source: 'mystery_reveal',
        userId: user?.id,
      });
    } finally {
      setIsAddingToCalendar(false);
    }
  }

  async function handleCopyPlan() {
    if (!plan) {
      setCalendarErrorMessage('Date plan not found.');
      return;
    }

    setIsCopyingPlan(true);
    setCalendarCopyMessage(undefined);

    try {
      await copyPlanToClipboard(plan);
      setCalendarCopyMessage('Copied.');
      setActionMessage('Date plan copied.');
    } catch (error) {
      setCalendarErrorMessage(error instanceof Error ? error.message : 'The plan could not be copied.');
    } finally {
      setIsCopyingPlan(false);
    }
  }

  function renderShareCard() {
    return (
      <Card padding="lg" style={styles.section} variant="outlined">
        <Text variant="subtitle">Share card</Text>
        <Text color="muted" variant="body">
          I made us a mystery date. No peeking until you open it:
        </Text>
        {mysteryLink ? (
          <Text selectable color="accent" variant="caption">
            {mysteryLink}
          </Text>
        ) : null}
        {errorMessage ? (
          <Text accessibilityRole="alert" color="danger" variant="body">
            {errorMessage}
          </Text>
        ) : null}
        {copyMessage ? (
          <Text color="success" variant="bodyStrong">
            {copyMessage}
          </Text>
        ) : null}
        <Button
          loading={isSharing}
          onPress={() => void handleShare()}
          title="Share mystery link"
        />
        <Button
          loading={isCopyingLink}
          onPress={() => void handleCopyLink()}
          title="Copy Link"
          variant="outline"
        />
      </Card>
    );
  }

  function renderRevealActions() {
    if (!hasRevealedPlan || !plan) {
      return null;
    }

    return (
      <Card padding="lg" style={styles.section} variant="elevated">
        <Text variant="subtitle">Ready when you are</Text>
        <View style={styles.actions}>
          <Button onPress={() => router.replace('/tabs/couple')} title="I'm in" />
          <Button
            loading={isSavingFavorite}
            onPress={() => void handleSave()}
            title={isFavoriteSaved ? 'Saved' : 'Save'}
            variant={isFavoriteSaved ? 'secondary' : 'outline'}
          />
          <Button onPress={handleAddToCalendar} title="Add to calendar" variant="secondary" />
        </View>
      </Card>
    );
  }

  if (status === 'loading') {
    return (
      <Screen title="Locked Mystery Card">
        <SkeletonState cardCount={2} message="Resolving mystery card..." />
      </Screen>
    );
  }

  if (status === 'error') {
    return (
      <Screen scroll title="Locked Mystery Card">
        <ErrorState
          message={errorMessage ?? 'Mystery card could not be loaded.'}
          onRetry={() => setRefreshKey((value) => value + 1)}
          retryLabel="Try again"
          title="Mystery card needs another try"
        />
      </Screen>
    );
  }

  if (!access || access.status === 'invalid') {
    return (
      <Screen scroll title="Locked Mystery Card">
        <EmptyState
          actionLabel="Back to deck"
          message="This mystery link is invalid, or the card is no longer available."
          onAction={() => router.replace('/tabs/home')}
          title="Invalid mystery link"
        />
      </Screen>
    );
  }

  if (access.status === 'expired') {
    return (
      <Screen scroll title="Locked Mystery Card">
        <LockedMetadata access={access} />
        <ErrorState
          message="This mystery card link has expired. Ask your partner to lock a fresh card from Date Night Deck."
          onRetry={() => router.replace('/tabs/home')}
          retryLabel="Back to deck"
          title="Mystery card expired"
        />
      </Screen>
    );
  }

  if (access.status === 'wrong_couple') {
    return (
      <Screen scroll title="Locked Mystery Card">
        <LockedMetadata access={access} />
        <ErrorState
          message="This card belongs to another couple deck. Switch accounts or ask your partner for a fresh invite."
          onRetry={() => router.replace('/tabs/home')}
          retryLabel="Back to deck"
          title="Wrong couple deck"
        />
      </Screen>
    );
  }

  if (access.status === 'couple_full') {
    return (
      <Screen scroll title="Locked Mystery Card">
        <LockedMetadata access={access} />
        <ErrorState
          message="This couple deck already has two active members, so this invite cannot be accepted."
          onRetry={() => router.replace('/tabs/home')}
          retryLabel="Back to deck"
          title="Couple deck is full"
        />
      </Screen>
    );
  }

  if (access.status === 'auth_required') {
    return (
      <Screen scroll title="Locked Mystery Card">
        <LockedMetadata access={access} />
        <Card padding="lg" style={styles.section} variant="warm">
          <Text variant="subtitle">Sign in to open it</Text>
          <Text color="muted" variant="body">
            This card is private to the couple deck. Sign in with email, then you can join or reveal it if you have access.
          </Text>
          <Button onPress={handleSignIn} title="Sign in with email" />
        </Card>
      </Screen>
    );
  }

  if (access.status === 'join_available') {
    return (
      <Screen scroll title="Locked Mystery Card">
        <LockedMetadata access={access} />
        <Card padding="lg" style={styles.section} variant="warm">
          <Text variant="subtitle">Join the couple deck</Text>
          <Text color="muted" variant="body">
            Your partner left this card sealed for you. Join the deck, then the reveal will unlock.
          </Text>
          <View style={styles.fieldGroup}>
            <Text color="muted" variant="caption">
              Display name
            </Text>
            <TextInput
              accessibilityLabel="Display name"
              autoCapitalize="words"
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
              selectionColor={colors.terracotta}
              style={styles.input}
              value={displayName}
            />
          </View>
          <ActionMessage message={actionMessage} />
          <Button
            loading={isJoining}
            onPress={() => void handleJoinCouple()}
            title="Join and open card"
          />
        </Card>
      </Screen>
    );
  }

  if (access.status === 'revealed') {
    return (
      <>
        <Screen scroll title="Locked Mystery Card">
          {plan ? (
            <>
              <DatePlanView actionMessage={actionMessage} plan={plan} showActions={false} />
              {renderRevealActions()}
            </>
          ) : (
            <EmptyState
              actionLabel="Back to deck"
              message="This mystery card has already been opened."
              onAction={() => router.replace('/tabs/home')}
              title="Already revealed"
            />
          )}
        </Screen>

        {plan ? (
          <CalendarScheduleSheet
            copyMessage={calendarCopyMessage}
            errorMessage={calendarErrorMessage}
            isCopying={isCopyingPlan}
            isSubmitting={isAddingToCalendar}
            onClose={() => setCalendarSheetVisible(false)}
            onCopyPlan={() => void handleCopyPlan()}
            onSubmit={(schedule) => void handleCreateCalendarEvent(schedule)}
            plan={plan}
            showCopyPlan={showCopyPlan}
            visible={calendarSheetVisible}
          />
        ) : null}
      </>
    );
  }

  if (access.status !== 'locked' || !access.mysteryDate || !plan) {
    return (
      <Screen scroll title="Locked Mystery Card">
        <EmptyState
          actionLabel="Back to deck"
          message="This mystery link is invalid, or your current account cannot open it."
          onAction={() => router.replace('/tabs/home')}
          title="Mystery card unavailable"
        />
      </Screen>
    );
  }

  return (
    <>
      <Screen scroll title="Locked Mystery Card">
        <MysteryRevealAnimation
          onReveal={handleReveal}
          onRevealed={() => setHasRevealedPlan(true)}
          plan={plan}
          revealStyleLabel={mysteryRevealStyleLabels[access.mysteryDate.revealStyle]}
          teaser={access.mysteryDate.teaser}
        />

        {hasRevealedPlan ? <RevealedPlanDetails plan={plan} /> : null}
        {renderRevealActions()}
        <ActionMessage message={actionMessage} />
        {renderShareCard()}

        <Button onPress={() => router.replace('/tabs/couple')} title="Back to couple deck" variant="secondary" />
      </Screen>

      <CalendarScheduleSheet
        copyMessage={calendarCopyMessage}
        errorMessage={calendarErrorMessage}
        isCopying={isCopyingPlan}
        isSubmitting={isAddingToCalendar}
        onClose={() => setCalendarSheetVisible(false)}
        onCopyPlan={() => void handleCopyPlan()}
        onSubmit={(schedule) => void handleCreateCalendarEvent(schedule)}
        plan={plan}
        showCopyPlan={showCopyPlan}
        visible={calendarSheetVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
  },
  detailGroup: {
    gap: spacing.xs,
  },
  fieldGroup: {
    gap: spacing.sm,
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
  section: {
    gap: spacing.md,
  },
});
