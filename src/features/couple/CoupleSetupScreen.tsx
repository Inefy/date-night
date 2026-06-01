// src/features/couple/CoupleSetupScreen.tsx
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { trackAnalyticsEvent } from '@/features/analytics/analyticsService';
import { isSupabaseConfigured, useAuth } from '@/features/auth/AuthProvider';
import { getOfflineMessage, useNetworkStatus } from '@/lib/networkStatus';
import { getLocalPreferences, saveDateNightPreferences } from '@/features/preferences/preferencesStorage';
import { getFirstRouteParam } from '@/lib/routeParams';

import {
  acceptCoupleInvite,
  createCoupleWithMember,
  getActiveCoupleProfile,
} from './coupleService';
import type { CoupleProfile } from './coupleTypes';

export function CoupleSetupScreen() {
  const router = useRouter();
  const { invite } = useLocalSearchParams<{ invite?: string | string[] }>();
  const { loading: authLoading, user } = useAuth();
  const { isOffline } = useNetworkStatus();
  const [coupleName, setCoupleName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState(getFirstRouteParam(invite) ?? '');
  const [loadingCouple, setLoadingCouple] = useState(false);
  const [submitting, setSubmitting] = useState<'create' | 'join' | undefined>();
  const [activeCouple, setActiveCouple] = useState<CoupleProfile | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    const inviteValue = getFirstRouteParam(invite);

    if (inviteValue) {
      setInviteCode(inviteValue);
    }
  }, [invite]);

  useEffect(() => {
    let isMounted = true;

    async function loadCouple() {
      if (!user || !isSupabaseConfigured) {
        setActiveCouple(undefined);
        return;
      }

      setLoadingCouple(true);

      try {
        const couple = await getActiveCoupleProfile(user.id);

        if (isMounted) {
          setActiveCouple(couple);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not check your couple deck.');
        }
      } finally {
        if (isMounted) {
          setLoadingCouple(false);
        }
      }
    }

    void loadCouple();

    return () => {
      isMounted = false;
    };
  }, [user]);

  function requestSignIn() {
    router.push({
      pathname: '/sign-in',
      params: {
        returnTo: inviteCode
          ? `/onboarding/couple-setup?invite=${encodeURIComponent(inviteCode)}`
          : '/onboarding/couple-setup',
      },
    });
  }

  async function handleCreateCouple() {
    setErrorMessage(undefined);

    if (!user) {
      requestSignIn();
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMessage('Couple sync is not connected yet. Add Supabase environment variables first.');
      return;
    }

    if (isOffline) {
      setErrorMessage(getOfflineMessage('join'));
      return;
    }

    setSubmitting('create');

    try {
      await createCoupleWithMember({
        coupleName,
        displayName,
        userId: user.id,
      });

      const preferences = await getLocalPreferences();
      await saveDateNightPreferences(preferences, user);
      router.replace('/tabs/couple');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not create a couple deck.');
    } finally {
      setSubmitting(undefined);
    }
  }

  async function handleJoinCouple() {
    setErrorMessage(undefined);

    if (!user) {
      requestSignIn();
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMessage('Couple sync is not connected yet. Add Supabase environment variables first.');
      return;
    }

    if (isOffline) {
      setErrorMessage(getOfflineMessage('join'));
      return;
    }

    setSubmitting('join');

    try {
      const acceptedInvite = await acceptCoupleInvite({
        displayName,
        rawInviteToken: inviteCode,
        userId: user.id,
      });
      trackAnalyticsEvent({
        coupleId: acceptedInvite.couple_id,
        eventName: 'invite_accepted',
        properties: { source: 'couple_setup' },
        userId: user.id,
      });
      router.replace('/tabs/couple');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not join this couple deck.');
    } finally {
      setSubmitting(undefined);
    }
  }

  if (authLoading || loadingCouple) {
    return (
      <Screen title="Couple setup">
        <LoadingState message="Checking your couple deck..." />
      </Screen>
    );
  }

  return (
    <Screen scroll title="Couple setup" subtitle="Build a shared deck only when it feels useful.">
      <Card padding="lg" style={styles.introCard} variant="warm">
        <Text color="accent" variant="overline">
          Optional, not urgent
        </Text>
        <Text variant="body">
          You can keep drawing dates solo, create a shared deck, or join one from a partner invite.
        </Text>
      </Card>

      {!user ? (
        <Card padding="lg" style={styles.card} variant="elevated">
          <Text variant="subtitle">Sign in to create or join</Text>
          <Text color="muted" variant="body">
            Couple decks sync through Supabase, so we need an email session before changing shared data.
          </Text>
          <Button fullWidth onPress={requestSignIn} title="Sign in with email" />
        </Card>
      ) : null}

      {activeCouple ? (
        <Card padding="lg" style={styles.card} variant="elevated">
          <Text variant="subtitle">You already have a couple deck</Text>
          <Text color="muted" variant="body">
            Open the Couple tab to invite your partner or review the shared profile.
          </Text>
          <Button fullWidth onPress={() => router.replace('/tabs/couple')} title="Open Couple" />
        </Card>
      ) : (
        <>
          <Card padding="lg" style={styles.card} variant="outlined">
            <Text variant="subtitle">Create a couple deck</Text>
            <Text color="muted" variant="body">
              Give the shared deck a name. You can change the mood and preferences later.
            </Text>
            <View style={styles.fieldGroup}>
              <Text color="muted" variant="caption">
                Couple name
              </Text>
              <TextInput
                accessibilityLabel="Couple name"
                editable={!submitting}
                onChangeText={setCoupleName}
                placeholder="Saturday people"
                placeholderTextColor={colors.muted}
                selectionColor={colors.terracotta}
                style={styles.input}
                value={coupleName}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text color="muted" variant="caption">
                Your display name
              </Text>
              <TextInput
                accessibilityLabel="Your display name"
                editable={!submitting}
                onChangeText={setDisplayName}
                placeholder="How your partner sees you"
                placeholderTextColor={colors.muted}
                selectionColor={colors.terracotta}
                style={styles.input}
                value={displayName}
              />
            </View>
            <Button
              disabled={!user}
              fullWidth
              loading={submitting === 'create'}
              onPress={() => void handleCreateCouple()}
              title="Create couple deck"
            />
          </Card>

          <Card padding="lg" style={styles.card} variant="outlined">
            <Text variant="subtitle">Join with an invite</Text>
            <Text color="muted" variant="body">
              Paste the invite link or token your partner shared. If it expired, they can make a new one.
            </Text>
            <View style={styles.fieldGroup}>
              <Text color="muted" variant="caption">
                Invite token or link
              </Text>
              <TextInput
                accessibilityLabel="Invite token or link"
                autoCapitalize="none"
                editable={!submitting}
                onChangeText={setInviteCode}
                placeholder="Paste invite here"
                placeholderTextColor={colors.muted}
                selectionColor={colors.terracotta}
                style={styles.input}
                value={inviteCode}
              />
            </View>
            <Button
              disabled={!user}
              fullWidth
              loading={submitting === 'join'}
              onPress={() => void handleJoinCouple()}
              title="Join couple deck"
              variant="secondary"
            />
          </Card>
        </>
      )}

      {errorMessage ? <ErrorState message={errorMessage} title="Couple setup needs another try" /> : null}

      <Button onPress={() => router.replace('/tabs/home')} title="Continue solo" variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
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
  introCard: {
    gap: spacing.md,
  },
});
