// src/features/favorites/FavoritesScreen.tsx
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { DateCardFront } from '@/components/DateCardFront';
import { Button, Card, EmptyState, ErrorState, Screen, SkeletonState, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { trackDatePlanAnalyticsEvent } from '@/features/analytics/analyticsService';
import { isSupabaseConfigured, useAuth } from '@/features/auth/AuthProvider';
import { energyLabels, vibeLabels } from '@/features/generator/generatorLabels';
import { getOfflineMessage, useNetworkStatus } from '@/lib/networkStatus';
import type { GeneratedDatePlan } from '@/types/domain';

import {
  listFavorites,
  removeFavorite,
  type FavoriteDateItem,
} from './favoritesService';

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

  return primaryVibe ? vibeLabels[primaryVibe] ?? primaryVibe.replaceAll('_', ' ') : 'Saved date';
}

export function FavoritesScreen() {
  const router = useRouter();
  const { loading: authLoading, user } = useAuth();
  const { isOffline } = useNetworkStatus();
  const [favorites, setFavorites] = useState<FavoriteDateItem[]>([]);
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | undefined>();

  const loadFavorites = useCallback(async () => {
    if (authLoading || !user) {
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMessage('Favorites need Supabase sync. Add the public Supabase environment variables and try again.');
      setIsLoading(false);
      return;
    }

    if (isOffline) {
      setErrorMessage(getOfflineMessage('save'));
      setIsLoading(false);
      return;
    }

    setActionMessage(undefined);
    setErrorMessage(undefined);
    setIsLoading(true);

    try {
      const savedFavorites = await listFavorites({ userId: user.id });

      setFavorites(savedFavorites);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Saved dates could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, isOffline, user]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadOnFocus() {
        if (authLoading || !user) {
          return;
        }

        if (!isSupabaseConfigured) {
          if (isActive) {
            setErrorMessage(
              'Favorites need Supabase sync. Add the public Supabase environment variables and try again.',
            );
            setIsLoading(false);
          }
          return;
        }

        if (isOffline) {
          if (isActive) {
            setErrorMessage(getOfflineMessage('save'));
            setIsLoading(false);
          }
          return;
        }

        if (isActive) {
          setActionMessage(undefined);
          setErrorMessage(undefined);
          setIsLoading(true);
        }

        try {
          const savedFavorites = await listFavorites({ userId: user.id });

          if (isActive) {
            setFavorites(savedFavorites);
          }
        } catch (error) {
          if (isActive) {
            setErrorMessage(error instanceof Error ? error.message : 'Saved dates could not be loaded.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      }

      void loadOnFocus();

      return () => {
        isActive = false;
      };
    }, [authLoading, isOffline, user]),
  );

  async function handleRemove(favorite: FavoriteDateItem) {
    if (!user) {
      return;
    }

    if (isOffline) {
      setActionMessage(undefined);
      setErrorMessage(getOfflineMessage('save'));
      return;
    }

    setRemovingId(favorite.generatedDateId);
    setActionMessage(undefined);
    setErrorMessage(undefined);

    try {
      await removeFavorite({
        generatedDateId: favorite.generatedDateId,
        userId: user.id,
      });
      setFavorites((currentFavorites) =>
        currentFavorites.filter((item) => item.generatedDateId !== favorite.generatedDateId),
      );
      setActionMessage('Removed from Favorites.');
      trackDatePlanAnalyticsEvent({
        coupleId: favorite.coupleId,
        eventName: 'date_unsaved',
        generatedDateId: favorite.generatedDateId,
        plan: favorite.plan,
        source: 'favorites',
        userId: user.id,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'That favorite could not be removed.');
    } finally {
      setRemovingId(undefined);
    }
  }

  function openDetail(favorite: FavoriteDateItem) {
    router.push({
      pathname: '/date/[id]',
      params: { id: favorite.generatedDateId },
    });
  }

  if (authLoading || isLoading) {
    return (
      <Screen title="Favorites">
        <SkeletonState cardCount={3} message="Loading saved date cards..." />
      </Screen>
    );
  }

  if (errorMessage) {
    return (
      <Screen scroll title="Favorites">
        <ErrorState
          message={errorMessage}
          onRetry={() => void loadFavorites()}
          retryLabel="Reload favorites"
          title="Favorites need another try"
        />
      </Screen>
    );
  }

  if (favorites.length === 0) {
    return (
      <Screen scroll title="Favorites">
        <EmptyState
          actionLabel="Draw a date"
          message="Saved dates will show up here after you tap Save on a revealed card."
          onAction={() => router.push('/tabs/home')}
          title="No favorites yet"
        />
      </Screen>
    );
  }

  return (
    <Screen scroll subtitle="Dates you saved for later." title="Favorites">
      {actionMessage ? (
        <Card accessibilityRole="alert" padding="md" variant="warm">
          <Text color="success" variant="bodyStrong">
            {actionMessage}
          </Text>
        </Card>
      ) : null}

      <View style={styles.list}>
        {favorites.map((favorite) => (
          <View key={favorite.favoriteId} style={styles.savedItem}>
            <Pressable
              accessibilityLabel={`Open saved date ${favorite.plan.title}`}
              accessibilityRole="button"
              onPress={() => openDetail(favorite)}
              style={({ pressed }) => [pressed ? styles.pressed : undefined]}
            >
              <DateCardFront
                budgetLabel={favorite.plan.estimatedBudgetLabel}
                category={getPrimaryVibe(favorite.plan)}
                description={favorite.plan.premise}
                durationLabel={formatDuration(favorite.plan.estimatedDurationMinutes)}
                title={favorite.plan.title}
                vibeLabel={energyLabels[favorite.plan.energy]}
              />
            </Pressable>

            {favorite.note ? (
              <Text color="muted" variant="body">
                {favorite.note}
              </Text>
            ) : null}

            <View style={styles.actionRow}>
              <Button
                onPress={() => openDetail(favorite)}
                size="sm"
                style={styles.actionButton}
                title="Open"
                variant="outline"
              />
              <Button
                loading={removingId === favorite.generatedDateId}
                onPress={() => void handleRemove(favorite)}
                size="sm"
                style={styles.actionButton}
                title="Unsave"
                variant="danger"
              />
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  list: {
    gap: spacing.xl,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  savedItem: {
    gap: spacing.md,
  },
});
