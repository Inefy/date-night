// src/features/mystery/MysteryRevealAnimation.tsx
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Vibration,
  View,
} from 'react-native';

import { Card, Chip, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import type { DateStep, GeneratedDatePlan } from '@/types/domain';

import { LockedMysteryCard } from './LockedMysteryCard';

type MysteryRevealAnimationProps = {
  onReveal: () => Promise<void>;
  onRevealed?: () => void;
  plan: GeneratedDatePlan;
  revealStyleLabel: string;
  teaser: string;
};

function runAnimation(animation: Animated.CompositeAnimation) {
  return new Promise<void>((resolve) => {
    animation.start(() => resolve());
  });
}

function StepRow({ step }: { step: DateStep }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text color="midnightPlum" variant="caption">
          {String(step.sortOrder)}
        </Text>
      </View>
      <View style={styles.stepCopy}>
        <Text variant="bodyStrong">{step.title}</Text>
        <Text color="muted" variant="body">
          {step.description}
        </Text>
      </View>
    </View>
  );
}

export function MysteryRevealAnimation({
  onReveal,
  onRevealed,
  plan,
  revealStyleLabel,
  teaser,
}: MysteryRevealAnimationProps) {
  const cardFloat = useRef(new Animated.Value(0)).current;
  const flipProgress = useRef(new Animated.Value(0)).current;
  const itineraryOpacity = useRef(new Animated.Value(0)).current;
  const itineraryTranslateY = useRef(new Animated.Value(18)).current;
  const sealOpacity = useRef(new Animated.Value(1)).current;
  const sealScale = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(16)).current;
  const [hasRevealed, setHasRevealed] = useState(false);
  const [isReducingMotion, setIsReducingMotion] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) {
        setIsReducingMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setIsReducingMotion);

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isReducingMotion || hasRevealed || isRevealing) {
      cardFloat.stopAnimation();
      cardFloat.setValue(0);
      return undefined;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cardFloat, {
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          toValue: -7,
          useNativeDriver: true,
        }),
        Animated.timing(cardFloat, {
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [cardFloat, hasRevealed, isReducingMotion, isRevealing]);

  function showReducedMotionResult() {
    setHasRevealed(true);
    requestAnimationFrame(() => {
      void runAnimation(
        Animated.parallel([
          Animated.timing(titleOpacity, {
            duration: 160,
            easing: Easing.out(Easing.quad),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(titleTranslateY, {
            duration: 160,
            easing: Easing.out(Easing.quad),
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(itineraryOpacity, {
            duration: 180,
            easing: Easing.out(Easing.quad),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(itineraryTranslateY, {
            duration: 180,
            easing: Easing.out(Easing.quad),
            toValue: 0,
            useNativeDriver: true,
          }),
        ]),
      );
    });
  }

  async function handleReveal() {
    if (hasRevealed || isRevealing) {
      return;
    }

    setIsRevealing(true);
    setRevealError(undefined);

    try {
      Vibration.vibrate(12);
      await onReveal();
      onRevealed?.();

      if (isReducingMotion) {
        showReducedMotionResult();
        return;
      }

      await runAnimation(
        Animated.parallel([
          Animated.timing(sealOpacity, {
            duration: 220,
            easing: Easing.out(Easing.quad),
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(sealScale, {
            duration: 220,
            easing: Easing.out(Easing.back(1.7)),
            toValue: 1.85,
            useNativeDriver: true,
          }),
        ]),
      );

      await runAnimation(
        Animated.timing(flipProgress, {
          duration: 520,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
      );

      setHasRevealed(true);

      await runAnimation(
        Animated.parallel([
          Animated.timing(titleOpacity, {
            duration: 280,
            easing: Easing.out(Easing.quad),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(titleTranslateY, {
            duration: 280,
            easing: Easing.out(Easing.quad),
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(120),
            Animated.parallel([
              Animated.timing(itineraryOpacity, {
                duration: 320,
                easing: Easing.out(Easing.quad),
                toValue: 1,
                useNativeDriver: true,
              }),
              Animated.timing(itineraryTranslateY, {
                duration: 320,
                easing: Easing.out(Easing.quad),
                toValue: 0,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ]),
      );
    } catch (error) {
      setRevealError(error instanceof Error ? error.message : 'The mystery card could not be revealed.');
    } finally {
      setIsRevealing(false);
    }
  }

  const cardRotateY = flipProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  if (hasRevealed) {
    return (
      <View style={styles.container}>
        <Card padding="lg" style={styles.resultCard} variant="elevated">
          <Chip label="Revealed" tone="candlelight" />
          <Animated.View
            style={[
              styles.resultTitle,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            <Text color="textInverse" variant="display">
              {plan.title}
            </Text>
            <Text color="dustyLavender" variant="body">
              {plan.premise}
            </Text>
          </Animated.View>
        </Card>

        <Animated.View
          style={[
            styles.itinerary,
            {
              opacity: itineraryOpacity,
              transform: [{ translateY: itineraryTranslateY }],
            },
          ]}
        >
          <Card padding="lg" style={styles.itineraryCard} variant="outlined">
            <Text variant="subtitle">Itinerary</Text>
            <View style={styles.stepList}>
              {plan.steps.map((step) => (
                <StepRow key={step.id} step={step} />
              ))}
            </View>
          </Card>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          transform: [
            { perspective: 900 },
            { translateY: cardFloat },
            { rotateY: cardRotateY },
          ],
        }}
      >
        <LockedMysteryCard
          disabled={isRevealing}
          onReveal={() => void handleReveal()}
          revealStyleLabel={revealStyleLabel}
          sealStyle={{
            opacity: sealOpacity,
            transform: [{ scale: sealScale }],
          }}
          teaser={teaser}
        />
      </Animated.View>

      {revealError ? (
        <Card accessibilityRole="alert" padding="md" variant="warm">
          <Text color="danger" variant="body">
            {revealError}
          </Text>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  itinerary: {
    gap: spacing.md,
  },
  itineraryCard: {
    gap: spacing.lg,
  },
  resultCard: {
    backgroundColor: colors.midnightPlum,
    gap: spacing.xl,
  },
  resultTitle: {
    gap: spacing.md,
  },
  stepCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  stepList: {
    gap: spacing.lg,
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: colors.terracotta,
    borderRadius: radii.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
});
