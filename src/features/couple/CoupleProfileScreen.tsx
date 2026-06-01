// src/features/couple/CoupleProfileScreen.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Chip, EmptyState, ErrorState, Screen, SkeletonState, Text } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { trackAnalyticsEvent } from '@/features/analytics/analyticsService';
import { isSupabaseConfigured, useAuth } from '@/features/auth/AuthProvider';
import { getOfflineMessage, useNetworkStatus } from '@/lib/networkStatus';
import {
  budgetLabels,
  energyLabels,
  foodLabels,
  locationLabels,
  weatherLabels,
} from '@/features/generator/generatorLabels';
import { preferenceVibeOptions } from '@/features/preferences/preferencesTypes';

import {
  createCoupleInvite,
  getActiveCoupleProfile,
  shareCoupleInvite,
} from './coupleService';
import type { CoupleInvite, CoupleMemberSummary, CoupleProfile } from './coupleTypes';

const preferenceVibeLabels = Object.fromEntries(
  preferenceVibeOptions.map((option) => [option.value, option.label]),
) as Partial<Record<string, string>>;

function formatDate(value: string | undefined) {
  if (!value) {
    return 'No date set';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes === 0 ? `${hours} hr` : `${hours} hr ${remainingMinutes} min`;
}

function MemberCard({ member }: { member: CoupleMemberSummary }) {
  return (
    <Card padding="lg" style={styles.memberCard} variant={member.isCurrentUser ? 'warm' : 'outlined'}>
      <View style={styles.memberHeader}>
        <Text variant="subtitle">{member.displayName}</Text>
        <Chip label={member.isCurrentUser ? 'You' : 'Partner'} tone={member.isCurrentUser ? 'sage' : 'lavender'} />
      </View>
      <Text color="muted" variant="body">
        {member.role === 'primary' ? 'Deck creator' : 'Couple member'}
      </Text>
      <Text color="muted" variant="caption">
        Joined {formatDate(member.joinedAt)}
      </Text>
    </Card>
  );
}

function PreferenceSummary({ couple }: { couple: CoupleProfile }) {
  const preferences = couple.defaultPreferences;
  const vibeSummary = preferences.preferredVibes
    .map((vibe) => preferenceVibeLabels[vibe] ?? vibe.replaceAll('_', ' '))
    .join(', ');
  const foodSummary = preferences.foodPreferences.map((foodMode) => foodLabels[foodMode]).join(', ');

  return (
    <Card padding="lg" style={styles.card} variant="outlined">
      <Text variant="subtitle">Shared preferences</Text>
      <View style={styles.summaryGrid}>
        <SummaryTile label="Budget" value={budgetLabels[preferences.defaultBudget]} />
        <SummaryTile label="Duration" value={formatDuration(preferences.defaultDurationMinutes)} />
        <SummaryTile label="Location" value={locationLabels[preferences.defaultLocationMode]} />
        <SummaryTile label="Energy" value={energyLabels[preferences.defaultEnergy]} />
        <SummaryTile label="Weather" value={weatherLabels[preferences.rainyIndoorPreference]} />
        <SummaryTile label="Food" value={foodSummary || 'Flexible'} />
      </View>
      <Text color="muted" variant="body">
        {vibeSummary ? `Vibes: ${vibeSummary}` : 'Vibes: starter deck defaults'}
      </Text>
    </Card>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryTile}>
      <Text color="muted" variant="overline">
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

export function CoupleProfileScreen() {
  const router = useRouter();
  const { loading: authLoading, user } = useAuth();
  const { isOffline } = useNetworkStatus();
  const [couple, setCouple] = useState<CoupleProfile | undefined>();
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const [lastInvite, setLastInvite] = useState<CoupleInvite | undefined>();

  const partnerPending = useMemo(() => {
    return Boolean(couple && couple.members.length < 2);
  }, [couple]);

  const loadCouple = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setErrorMessage(undefined);
      setCouple(undefined);
      setLoading(false);
      return;
    }

    if (isOffline) {
      setErrorMessage(getOfflineMessage('join'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(undefined);

    try {
      setCouple(await getActiveCoupleProfile(user.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load your couple deck.');
    } finally {
      setLoading(false);
    }
  }, [isOffline, user]);

  useEffect(() => {
    void loadCouple();
  }, [loadCouple]);

  async function handleInvitePartner() {
    if (!couple) {
      return;
    }

    if (couple.members.length >= 2) {
      setActionMessage('Your couple deck already has two active members.');
      return;
    }

    if (isOffline) {
      setErrorMessage(getOfflineMessage('join'));
      return;
    }

    setInviting(true);
    setActionMessage(undefined);
    setErrorMessage(undefined);
    let createdInvite: CoupleInvite | undefined;

    try {
      createdInvite = await createCoupleInvite(couple.id);
      setLastInvite(createdInvite);
      trackAnalyticsEvent({
        coupleId: couple.id,
        eventName: 'invite_created',
        properties: {
          partner_pending: couple.members.length < 2,
          source: 'couple_profile',
        },
        userId: user?.id,
      });
      await shareCoupleInvite(createdInvite);
      setActionMessage('Invite ready. If the share sheet did not open, use the link shown below.');
      await loadCouple();
    } catch (error) {
      if (createdInvite) {
        setActionMessage(`Invite link: ${createdInvite.link}`);
      }

      setErrorMessage(error instanceof Error ? error.message : 'Could not create an invite.');
    } finally {
      setInviting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <Screen bottomInset={64} title="Couple">
        <SkeletonState cardCount={3} message="Loading your couple deck..." />
      </Screen>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <Screen bottomInset={64} scroll title="Couple">
        <ErrorState
          message="Add Supabase environment variables before creating or joining a couple deck."
          title="Couple sync is not connected"
        />
      </Screen>
    );
  }

  if (errorMessage && !couple) {
    return (
      <Screen bottomInset={64} scroll title="Couple">
        <ErrorState
          message={errorMessage}
          onRetry={() => void loadCouple()}
          retryLabel="Retry"
          title="Could not load couple"
        />
      </Screen>
    );
  }

  if (!couple) {
    return (
      <Screen bottomInset={64} scroll title="Couple">
        <EmptyState
          actionLabel="Create or join"
          message="Start a shared deck when you want invites, mystery locks, and partner-ready defaults."
          onAction={() => router.push('/onboarding/couple-setup')}
          title="No couple deck yet"
        />
        <Button onPress={() => router.replace('/tabs/home')} title="Continue solo" variant="ghost" />
      </Screen>
    );
  }

  return (
    <Screen bottomInset={64} scroll title="Couple">
      <Card padding="lg" style={styles.heroCard} variant="elevated">
        <Text color="dustyLavender" variant="overline">
          Couple deck
        </Text>
        <Text color="textInverse" variant="display">{couple.name ?? 'Your shared deck'}</Text>
        <Text color="dustyLavender" variant="body">
          {partnerPending
            ? 'One half is here. Invite your partner when the timing is right.'
            : 'Both partners are connected and ready to draw from the same deck.'}
        </Text>
      </Card>

      <Card padding="lg" style={styles.card} variant="warm">
        <View style={styles.sectionHeader}>
          <Text variant="subtitle">Members</Text>
          <Chip label={`${couple.members.length}/2 active`} tone={couple.members.length === 2 ? 'sage' : 'candlelight'} />
        </View>
        <View style={styles.memberList}>
          {couple.members.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </View>
      </Card>

      {partnerPending ? (
        <Card padding="lg" style={styles.card} variant="outlined">
          <Text variant="subtitle">Partner pending</Text>
          <Text color="muted" variant="body">
            Send an invite link. It uses a high-entropy token and can be replaced with a fresh invite later.
          </Text>
          {couple.pendingInvite ? (
            <Text color="muted" variant="caption">
              Current invite expires {formatDate(couple.pendingInvite.expiresAt)}.
            </Text>
          ) : null}
          <Button
            fullWidth
            loading={inviting}
            onPress={() => void handleInvitePartner()}
            title={couple.pendingInvite ? 'Create and share fresh invite' : 'Invite partner'}
          />
        </Card>
      ) : null}

      <PreferenceSummary couple={couple} />

      {lastInvite ? (
        <Card padding="md" style={styles.card} variant="warm">
          <Text variant="bodyStrong">Invite link</Text>
          <Text color="muted" selectable variant="body">
            {lastInvite.link}
          </Text>
        </Card>
      ) : null}

      {actionMessage ? (
        <Card padding="md" variant="warm">
          <Text color="success" variant="bodyStrong">
            {actionMessage}
          </Text>
        </Card>
      ) : null}

      {errorMessage ? <ErrorState message={errorMessage} title="Invite needs another try" /> : null}

      <Button onPress={() => router.push('/onboarding/preferences')} title="Edit shared preferences" variant="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.midnightPlum,
    borderColor: '#3C2A48',
    gap: spacing.md,
    overflow: 'hidden',
  },
  memberCard: {
    gap: spacing.sm,
  },
  memberHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  memberList: {
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryTile: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: spacing.xs,
  },
});
