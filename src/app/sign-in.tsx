// src/app/sign-in.tsx
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Card, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { isSupabaseConfigured, useAuth } from '@/features/auth/AuthProvider';
import { toFriendlyAuthError } from '@/features/auth/authErrors';

function getReturnTo(value: string | string[] | undefined) {
  const route = Array.isArray(value) ? value[0] : value;

  if (!route || !route.startsWith('/') || route.startsWith('//')) {
    return '/tabs/home';
  }

  return route;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignInScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const nextRoute = useMemo(() => getReturnTo(returnTo), [returnTo]);
  const { authError, loading, signIn, user } = useAuth();
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(nextRoute);
    }
  }, [loading, nextRoute, router, user]);

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase();

    setErrorMessage(undefined);
    setSuccessMessage(undefined);

    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage('Enter a valid email address.');
      return;
    }

    setSubmitting(true);

    try {
      await signIn(normalizedEmail, { returnTo: nextRoute });
      setSuccessMessage('Check your email for a secure sign-in link.');
    } catch (error) {
      setErrorMessage(toFriendlyAuthError(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Screen title="Sign in">
        <LoadingState message="Checking your session..." />
      </Screen>
    );
  }

  return (
    <Screen scroll title="Sign in" subtitle="Use email-based auth to save and share dates.">
      {!isSupabaseConfigured ? (
        <ErrorState
          message="Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your environment before signing in."
          title="Auth is not connected"
        />
      ) : null}

      {authError ? <ErrorState message={authError} title="Session check failed" /> : null}

      <Card padding="lg" style={styles.formCard} variant="elevated">
        <View style={styles.copy}>
          <Text variant="subtitle">Email sign-in</Text>
          <Text color="muted" variant="body">
            We will email a secure link. No password is needed for the MVP.
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text color="muted" variant="caption">
            Email
          </Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!submitting}
            keyboardType="email-address"
            onChangeText={setEmail}
            onSubmitEditing={() => void handleSubmit()}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            returnKeyType="send"
            selectionColor={colors.terracotta}
            style={styles.input}
            textContentType="emailAddress"
            value={email}
          />
        </View>

        {errorMessage ? (
          <Text accessibilityRole="alert" color="danger" variant="body">
            {errorMessage}
          </Text>
        ) : null}

        {successMessage ? (
          <Card padding="md" variant="warm">
            <Text color="success" variant="bodyStrong">
              {successMessage}
            </Text>
          </Card>
        ) : null}

        <Button
          disabled={!isSupabaseConfigured}
          fullWidth
          loading={submitting}
          onPress={() => void handleSubmit()}
          title="Email me a sign-in link"
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: {
    gap: spacing.sm,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  formCard: {
    gap: spacing.lg,
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
});
