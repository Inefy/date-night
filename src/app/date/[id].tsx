// src/app/date/[id].tsx
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DatePlanView } from '@/components/DatePlanView';
import { Button, EmptyState, ErrorState, Screen, SkeletonState } from '@/components/ui';
import { dateTemplates } from '@/data/dateTemplates';
import { trackDatePlanAnalyticsEvent } from '@/features/analytics/analyticsService';
import { isSupabaseConfigured, useAuth } from '@/features/auth/AuthProvider';
import { CalendarScheduleSheet } from '@/features/calendar/CalendarScheduleSheet';
import {
  copyPlanToClipboard,
  createDateNightCalendarEvent,
  saveCalendarEventMetadata,
  type CalendarScheduleInput,
} from '@/features/calendar/calendarService';
import { getCurrentActiveMembership } from '@/features/couple/coupleService';
import {
  isFavorite as getIsFavorite,
  removeFavorite,
  saveFavorite,
} from '@/features/favorites/favoritesService';
import {
  createGeneratedDate,
  getGeneratedDateById,
  isPersistedGeneratedDateId,
} from '@/features/generatedDates/generatedDateService';
import { saveDateFeedback } from '@/features/feedback/dateFeedbackService';
import { RemixReasonSheet } from '@/features/remix/RemixReasonSheet';
import { getRemixTransitionMessage, remixReasonLabels } from '@/features/remix/remixOptions';
import { generateDatePlan, type RemixReason } from '@/lib/dateGenerator';
import {
  getGeneratedDatePlan,
  getRecentGeneratedTemplateIds,
  saveGeneratedDatePlan,
} from '@/lib/generatedDateStore';
import { getOfflineMessage, useNetworkStatus } from '@/lib/networkStatus';
import { getFirstRouteParam } from '@/lib/routeParams';
import type { GeneratedDatePlan } from '@/types/domain';

type ScreenStatus = 'loading' | 'ready' | 'not_found' | 'permission' | 'error';

export default function DateDetailScreen() {
  const router = useRouter();
  const { loading: authLoading, user } = useAuth();
  const { isOffline } = useNetworkStatus();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const planId = getFirstRouteParam(id);
  const [status, setStatus] = useState<ScreenStatus>('loading');
  const [plan, setPlan] = useState<GeneratedDatePlan | undefined>();
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isPersisted, setIsPersisted] = useState(false);
  const [isFavoriteSaved, setIsFavoriteSaved] = useState(false);
  const [isRemixing, setIsRemixing] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [favoriteGeneratedDateId, setFavoriteGeneratedDateId] = useState<string | undefined>();
  const [calendarSheetVisible, setCalendarSheetVisible] = useState(false);
  const [calendarErrorMessage, setCalendarErrorMessage] = useState<string | undefined>();
  const [calendarCopyMessage, setCalendarCopyMessage] = useState<string | undefined>();
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [isCopyingPlan, setIsCopyingPlan] = useState(false);
  const [showCopyPlan, setShowCopyPlan] = useState(false);
  const [remixSheetVisible, setRemixSheetVisible] = useState(false);
  const [selectedRemixReason, setSelectedRemixReason] = useState<RemixReason | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadPlan() {
      if (!planId) {
        if (isMounted) {
          setStatus('not_found');
        }
        return;
      }

      const storedPlan = getGeneratedDatePlan(planId);

      if (!storedPlan) {
        if (!isPersistedGeneratedDateId(planId)) {
          if (isMounted) {
            setStatus('not_found');
          }
          return;
        }

        if (authLoading) {
          if (isMounted) {
            setStatus('loading');
          }
          return;
        }

        if (!user) {
          if (isMounted) {
            setStatus('permission');
          }
          return;
        }

        if (!isSupabaseConfigured) {
          if (isMounted) {
            setErrorMessage('Date sync is not connected. Add Supabase environment variables and try again.');
            setStatus('error');
          }
          return;
        }

        if (isOffline) {
          if (isMounted) {
            setErrorMessage(getOfflineMessage('sync'));
            setStatus('error');
          }
          return;
        }

        try {
          const persistedDate = await getGeneratedDateById(planId);

          if (!isMounted) {
            return;
          }

          if (!persistedDate) {
            setStatus('permission');
            return;
          }

          saveGeneratedDatePlan(persistedDate.plan, persistedDate.id);
          setPlan(persistedDate.plan);
          setIsPersisted(true);
          setStatus('ready');
        } catch (error) {
          if (isMounted) {
            setErrorMessage(error instanceof Error ? error.message : 'The date plan could not be loaded.');
            setStatus('error');
          }
        }

        return;
      }

      if (isMounted) {
        setPlan(storedPlan);
        setIsPersisted(isPersistedGeneratedDateId(planId));
        setStatus('ready');
      }
    }

    void loadPlan();

    return () => {
      isMounted = false;
    };
  }, [authLoading, isOffline, planId, refreshKey, user]);

  useEffect(() => {
    let isMounted = true;

    async function loadFavoriteState() {
      if (authLoading || !user || !planId || !isPersistedGeneratedDateId(planId)) {
        if (isMounted) {
          setFavoriteGeneratedDateId(undefined);
          setIsFavoriteSaved(false);
        }
        return;
      }

      if (!isSupabaseConfigured) {
        if (isMounted) {
          setFavoriteGeneratedDateId(undefined);
          setIsFavoriteSaved(false);
        }
        return;
      }

      try {
        const saved = await getIsFavorite({
          generatedDateId: planId,
          userId: user.id,
        });

        if (isMounted) {
          setFavoriteGeneratedDateId(planId);
          setIsFavoriteSaved(saved);
        }
      } catch {
        if (isMounted) {
          setFavoriteGeneratedDateId(planId);
          setIsFavoriteSaved(false);
        }
      }
    }

    void loadFavoriteState();

    return () => {
      isMounted = false;
    };
  }, [authLoading, planId, user]);

  function requireSignedIn(message: string) {
    if (authLoading) {
      setActionMessage('Checking your account before continuing...');
      return false;
    }

    if (!user) {
      setActionMessage(message);
      router.push({
        pathname: '/sign-in',
        params: { returnTo: planId ? `/date/${planId}` : '/tabs/home' },
      });
      return false;
    }

    return true;
  }

  async function handleSave() {
    if (!plan) {
      setStatus('error');
      return;
    }

    if (!requireSignedIn('Sign in to save this date to Favorites. You can keep drawing without an account.')) {
      return;
    }

    const activeUser = user;

    if (!activeUser) {
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

    const currentGeneratedDateId =
      planId && isPersistedGeneratedDateId(planId) ? planId : favoriteGeneratedDateId;

    setActionMessage(undefined);
    setIsSavingFavorite(true);

    try {
      if (isFavoriteSaved && currentGeneratedDateId) {
        await removeFavorite({
          generatedDateId: currentGeneratedDateId,
          userId: activeUser.id,
        });
        setIsFavoriteSaved(false);
        setActionMessage('Removed from Favorites.');
        trackDatePlanAnalyticsEvent({
          eventName: 'date_unsaved',
          generatedDateId: currentGeneratedDateId,
          plan,
          source: 'date_detail',
          userId: activeUser.id,
        });
        return;
      }

      const favorite = await saveFavorite({
        generatedDateId: currentGeneratedDateId,
        plan,
        userId: activeUser.id,
      });

      saveGeneratedDatePlan(favorite.plan, favorite.generatedDateId);
      setFavoriteGeneratedDateId(favorite.generatedDateId);
      setIsFavoriteSaved(true);
      setIsPersisted(true);
      setPlan(favorite.plan);
      setActionMessage('Saved to Favorites.');
      trackDatePlanAnalyticsEvent({
        coupleId: favorite.coupleId,
        eventName: 'date_saved',
        generatedDateId: favorite.generatedDateId,
        plan: favorite.plan,
        source: 'date_detail',
        userId: activeUser.id,
      });

      if (planId !== favorite.generatedDateId) {
        router.replace({
          pathname: '/date/[id]',
          params: { id: favorite.generatedDateId },
        });
      }
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Favorites could not be updated right now.');
    } finally {
      setIsSavingFavorite(false);
    }
  }

  function handleLockForPartner() {
    if (!requireSignedIn('Sign in to lock and share this date with your partner.')) {
      return;
    }

    if (!plan) {
      setStatus('error');
      return;
    }

    if (isOffline) {
      setActionMessage(getOfflineMessage('share'));
      return;
    }

    router.push({
      pathname: '/mystery/create',
      params: { dateId: planId ?? plan.seed },
    });
  }

  function handleAddToCalendar() {
    setActionMessage(undefined);
    setCalendarCopyMessage(undefined);
    setCalendarErrorMessage(undefined);
    setShowCopyPlan(false);
    setCalendarSheetVisible(true);
    if (plan) {
      trackDatePlanAnalyticsEvent({
        eventName: 'calendar_add_started',
        generatedDateId: planId,
        plan,
        source: 'date_detail',
        userId: user?.id,
      });
    }
  }

  async function ensureGeneratedDateForCalendar(activeUserId: string) {
    if (!plan) {
      throw new Error('Date plan not found.');
    }

    let membership: Awaited<ReturnType<typeof getCurrentActiveMembership>> | undefined;

    try {
      membership = await getCurrentActiveMembership(activeUserId);
    } catch {
      membership = undefined;
    }

    if (planId && isPersistedGeneratedDateId(planId)) {
      return {
        coupleId: membership?.couple_id,
        generatedDateId: planId,
      };
    }

    const persistedDate = await createGeneratedDate({
      coupleId: membership?.couple_id,
      filters: {},
      plan,
      userId: activeUserId,
    });

    const persistedPlanId = saveGeneratedDatePlan(persistedDate.plan, persistedDate.id);

    setFavoriteGeneratedDateId(persistedDate.id);
    setIsPersisted(true);
    setPlan(persistedDate.plan);

    if (planId !== persistedPlanId) {
      router.replace({
        pathname: '/date/[id]',
        params: { id: persistedPlanId },
      });
    }

    return {
      coupleId: persistedDate.coupleId,
      generatedDateId: persistedDate.id,
    };
  }

  async function handleCreateCalendarEvent(schedule: CalendarScheduleInput) {
    if (!plan) {
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
          eventName: 'calendar_add_failed',
          generatedDateId: planId,
          plan,
          properties: { failure_reason: result.reason },
          source: 'date_detail',
          userId: user?.id,
        });
        return;
      }

      let metadataWarning: string | undefined;
      let analyticsCoupleId: string | undefined;
      let analyticsGeneratedDateId = planId;

      if (user && isSupabaseConfigured && !isOffline) {
        try {
          const persistedDate = await ensureGeneratedDateForCalendar(user.id);
          analyticsCoupleId = persistedDate.coupleId;
          analyticsGeneratedDateId = persistedDate.generatedDateId;

          await saveCalendarEventMetadata({
            calendarId: result.event.calendarId,
            coupleId: persistedDate.coupleId,
            description: result.event.notes,
            endsAt: result.event.endAt,
            eventId: result.event.eventId,
            generatedDateId: persistedDate.generatedDateId,
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
        coupleId: analyticsCoupleId,
        eventName: 'calendar_add_completed',
        generatedDateId: analyticsGeneratedDateId,
        plan,
        source: 'date_detail',
        userId: user?.id,
      });
    } catch (error) {
      setCalendarErrorMessage(error instanceof Error ? error.message : 'Calendar could not be updated right now.');
      trackDatePlanAnalyticsEvent({
        eventName: 'calendar_add_failed',
        generatedDateId: planId,
        plan,
        properties: { failure_reason: 'create_failed' },
        source: 'date_detail',
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

  function handleOpenRemix() {
    setActionMessage(undefined);
    setSelectedRemixReason(undefined);
    setRemixSheetVisible(true);
  }

  async function saveRemixFeedback(
    reason: RemixReason,
    membership: Awaited<ReturnType<typeof getCurrentActiveMembership>> | undefined,
  ) {
    if (!plan || !user || !isSupabaseConfigured) {
      return;
    }

    await saveDateFeedback({
      coupleId: membership?.couple_id,
      generatedDateId: planId && isPersistedGeneratedDateId(planId) ? planId : undefined,
      notes: `Remix reason: ${remixReasonLabels[reason]}`,
      plan,
      rating: reason === 'surprise_me_again' ? 'neutral' : 'disliked',
      remixReasons: [reason],
      userId: user.id,
    });
  }

  async function handleRemix() {
    if (!plan) {
      setStatus('error');
      return;
    }

    if (!selectedRemixReason) {
      setActionMessage('Choose what missed before drawing another card.');
      return;
    }

    try {
      const remixReason = selectedRemixReason;
      const transitionMessage = getRemixTransitionMessage(remixReason);

      setIsRemixing(true);
      setActionMessage(transitionMessage);

      let membership: Awaited<ReturnType<typeof getCurrentActiveMembership>> | undefined;

      if (user && isSupabaseConfigured) {
        try {
          membership = await getCurrentActiveMembership(user.id);
        } catch {
          membership = undefined;
        }

        try {
          await saveRemixFeedback(remixReason, membership);
        } catch {
          // Feedback should not block drawing the replacement card.
        }
      }

      const remixedPlan = generateDatePlan({}, dateTemplates, {
        recentlyUsedTemplateIds: Array.from(
          new Set([...getRecentGeneratedTemplateIds(), plan.sourceTemplateId]),
        ),
        remix: {
          previousTemplateId: plan.sourceTemplateId,
          reasons: [remixReason],
        },
      });
      let remixedPlanId = saveGeneratedDatePlan(remixedPlan);

      if (user && isSupabaseConfigured) {
        if (membership) {
          const persistedDate = await createGeneratedDate({
            coupleId: membership.couple_id,
            filters: {},
            plan: remixedPlan,
            userId: user.id,
          });

          remixedPlanId = saveGeneratedDatePlan(persistedDate.plan, persistedDate.id);
        }
      }

      setRemixSheetVisible(false);
      trackDatePlanAnalyticsEvent({
        coupleId: membership?.couple_id,
        eventName: 'date_remixed',
        generatedDateId: planId,
        plan,
        remixReason,
        source: 'date_detail',
        userId: user?.id,
      });
      router.replace({ pathname: '/date/[id]', params: { id: remixedPlanId } });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The remix could not be created.');
      setStatus('error');
    } finally {
      setIsRemixing(false);
    }
  }

  if (status === 'loading') {
    return (
      <Screen title="Date result">
        <SkeletonState cardCount={3} message="Loading date details..." />
      </Screen>
    );
  }

  if (status === 'error') {
    return (
      <Screen scroll title="Date result">
        <ErrorState
          message={errorMessage ?? 'The date plan could not be loaded. Draw a fresh card from the deck.'}
          onRetry={() => {
            setStatus('loading');
            setRefreshKey((value) => value + 1);
          }}
          retryLabel="Try again"
          title="Could not reveal this card"
        />
      </Screen>
    );
  }

  if (status === 'permission') {
    return (
      <Screen scroll title="Date result">
        <ErrorState
          message="This generated date was not found, or your current account does not have access to its couple deck."
          onRetry={() => router.replace('/tabs/home')}
          retryLabel="Back to deck"
          title="Date not available"
        />
      </Screen>
    );
  }

  if (status === 'not_found' || !plan) {
    return (
      <Screen scroll title="Date result">
        <EmptyState
          actionLabel="Back to deck"
          message="This generated plan is only stored temporarily. Draw a new card from Home."
          onAction={() => router.replace('/tabs/home')}
          title="Date plan not found"
        />
      </Screen>
    );
  }

  return (
    <>
      <Screen scroll title="Date result">
        <DatePlanView
          actionMessage={actionMessage}
          isFavorite={isFavoriteSaved}
          isRemixing={isRemixing}
          isSavingFavorite={isSavingFavorite}
          onAddToCalendar={handleAddToCalendar}
          onLockForPartner={handleLockForPartner}
          onRemix={handleOpenRemix}
          onSave={() => void handleSave()}
          plan={plan}
        />

        <Button onPress={() => router.replace('/tabs/home')} title="Back to deck" variant="secondary" />
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

      <RemixReasonSheet
        isSubmitting={isRemixing}
        onClose={() => setRemixSheetVisible(false)}
        onSelectReason={setSelectedRemixReason}
        onSubmit={() => void handleRemix()}
        selectedReason={selectedRemixReason}
        visible={remixSheetVisible}
      />
    </>
  );
}
