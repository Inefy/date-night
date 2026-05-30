// src/app/tabs/settings.tsx
import { useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Card, Chip, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { isSupabaseConfigured, useAuth } from '@/features/auth/AuthProvider';
import { toFriendlyAuthError } from '@/features/auth/authErrors';
import { getActiveCoupleProfile } from '@/features/couple/coupleService';
import type { CoupleProfile } from '@/features/couple/coupleTypes';
import {
  getUserProfile,
  updateUserDisplayName,
  type UserProfileSummary,
} from '@/features/settings/profileService';

function getFallbackDisplayName(email?: string) {
  const emailName = email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim();

  return emailName && emailName.length > 0 ? emailName : 'Date Night Partner';
}

function getAppVersion() {
  return Constants.expoConfig?.version ?? '1.0.0';
}

function formatCoupleStatus(couple: CoupleProfile | undefined, signedIn: boolean) {
  if (!signedIn) {
    return 'Guest mode';
  }

  if (!isSupabaseConfigured) {
    return 'Sync not connected';
  }

  if (!couple) {
    return 'No couple deck yet';
  }

  const deckName = couple.name ?? 'Your shared deck';

  return `${deckName} - ${couple.members.length}/2 members`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { loading, profileError, signOut, user } = useAuth();
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const [couple, setCouple] = useState<CoupleProfile | undefined>();
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [profile, setProfile] = useState<UserProfileSummary | undefined>();
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const displayName = useMemo(
    () => profile?.displayName ?? getFallbackDisplayName(user?.email),
    [profile?.displayName, user?.email],
  );
  const email = profile?.email ?? user?.email;
  const coupleStatus = formatCoupleStatus(couple, Boolean(user));

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      if (loading || !user || !isSupabaseConfigured) {
        if (isMounted) {
          setProfile(undefined);
          setCouple(undefined);
          setDisplayNameDraft(getFallbackDisplayName(user?.email));
        }
        return;
      }

      setLoadingSettings(true);
      setErrorMessage(undefined);

      try {
        const [loadedProfile, loadedCouple] = await Promise.all([
          getUserProfile(user.id),
          getActiveCoupleProfile(user.id),
        ]);

        if (isMounted) {
          const resolvedProfile = loadedProfile ?? {
            displayName: getFallbackDisplayName(user.email),
            email: user.email,
          };

          setProfile(resolvedProfile);
          setCouple(loadedCouple);
          setDisplayNameDraft(resolvedProfile.displayName);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Settings could not be loaded.');
        }
      } finally {
        if (isMounted) {
          setLoadingSettings(false);
        }
      }
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, [loading, user]);

  async function handleSaveDisplayName() {
    if (!user) {
      return;
    }

    setActionMessage(undefined);
    setErrorMessage(undefined);
    setSavingDisplayName(true);

    try {
      const updatedProfile = await updateUserDisplayName({
        displayName: displayNameDraft,
        userId: user.id,
      });

      setProfile(updatedProfile);
      setDisplayNameDraft(updatedProfile.displayName);
      setEditingDisplayName(false);
      setActionMessage('Display name updated.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Display name could not be updated.');
    } finally {
      setSavingDisplayName(false);
    }
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You can keep drawing as a guest after signing out.', [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: () => void handleSignOut(),
        style: 'destructive',
        text: 'Sign out',
      },
    ]);
  }

  async function handleSignOut() {
    setErrorMessage(undefined);
    setSigningOut(true);

    try {
      await signOut();
      router.replace('/welcome');
    } catch (error) {
      setErrorMessage(toFriendlyAuthError(error));
    } finally {
      setSigningOut(false);
    }
  }

  if (loading || loadingSettings) {
    return (
      <Screen title="Settings">
        <LoadingState message="Checking your settings..." />
      </Screen>
    );
  }

  return (
    <Screen scroll title="Settings">
      <Card padding="lg" style={[styles.card, styles.accountCard]} variant="elevated">
        <View style={styles.sectionHeader}>
          <View style={styles.copy}>
            <Text color="dustyLavender" variant="overline">
              Account
            </Text>
            <Text color="textInverse" variant="subtitle">{user ? displayName : 'Browsing as guest'}</Text>
            <Text color="dustyLavender" variant="body">
              {email ?? 'No email connected'}
            </Text>
          </View>
          <Chip label={user ? 'Signed in' : 'Guest'} tone={user ? 'sage' : 'candlelight'} />
        </View>

        {user && editingDisplayName ? (
          <View style={styles.fieldGroup}>
            <Text color="dustyLavender" variant="caption">
              Display name
            </Text>
            <TextInput
              accessibilityLabel="Display name"
              autoCapitalize="words"
              editable={!savingDisplayName}
              onChangeText={setDisplayNameDraft}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
              selectionColor={colors.terracotta}
              style={styles.input}
              value={displayNameDraft}
            />
            <View style={styles.actionRow}>
              <Button
                disabled={savingDisplayName}
                onPress={() => {
                  setDisplayNameDraft(displayName);
                  setEditingDisplayName(false);
                }}
                style={styles.actionButton}
                title="Cancel"
                variant="ghost"
              />
              <Button
                loading={savingDisplayName}
                onPress={() => void handleSaveDisplayName()}
                style={styles.actionButton}
                title="Save name"
              />
            </View>
          </View>
        ) : user ? (
          <Button
            fullWidth
            onPress={() => setEditingDisplayName(true)}
            title="Edit display name"
            variant="outline"
          />
        ) : (
          <Button
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/sign-in',
                params: { returnTo: '/tabs/settings' },
              })
            }
            title="Sign in with email"
          />
        )}
      </Card>

      <Card padding="lg" style={styles.card} variant="warm">
        <View style={styles.copy}>
          <Text variant="subtitle">Couple status</Text>
          <Text color="muted" variant="body">
            {coupleStatus}
          </Text>
        </View>
        <Button
          fullWidth
          onPress={() => router.push(user ? '/tabs/couple' : '/onboarding/couple-setup')}
          title={user ? 'Open couple profile' : 'Set up couple deck'}
          variant="secondary"
        />
      </Card>

      <Card padding="lg" style={styles.card} variant="outlined">
        <Text variant="subtitle">Preferences</Text>
        <Text color="muted" variant="body">
          Update the defaults the generator starts from before each draw.
        </Text>
        <Button
          fullWidth
          onPress={() => router.push('/onboarding/preferences')}
          title={user ? 'Edit default preferences' : 'Edit local preferences'}
          variant="secondary"
        />
      </Card>

      <Card padding="lg" style={styles.card} variant="outlined">
        <Text variant="subtitle">Privacy</Text>
        <Text color="muted" variant="body">
          Date Night Deck does not need your exact location for the MVP.
        </Text>
        <Text color="muted" variant="body">
          Your couple data is private to your couple profile.
        </Text>
      </Card>

      <Card padding="lg" style={styles.card} variant="outlined">
        <Text variant="subtitle">App</Text>
        <Text color="muted" variant="body">
          Version {getAppVersion()}
        </Text>
      </Card>

      {user ? (
        <Card padding="lg" style={styles.card} variant="outlined">
          <Text variant="subtitle">Account actions</Text>
          <Button
            fullWidth
            loading={signingOut}
            onPress={confirmSignOut}
            title="Sign out"
            variant="danger"
          />
        </Card>
      ) : null}

      {actionMessage ? (
        <Card padding="md" variant="warm">
          <Text color="success" variant="bodyStrong">
            {actionMessage}
          </Text>
        </Card>
      ) : null}

      {profileError ? (
        <ErrorState message={profileError} title="Profile setup needs attention" />
      ) : null}

      {errorMessage ? (
        <ErrorState message={errorMessage} title="Settings need another try" />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  accountCard: {
    backgroundColor: colors.midnightPlum,
    borderColor: '#3C2A48',
  },
  actionButton: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  card: {
    gap: spacing.lg,
  },
  copy: {
    flex: 1,
    gap: spacing.sm,
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
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
});
