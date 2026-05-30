// src/components/DatePlanView.tsx
import { StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { energyLabels, locationLabels, vibeLabels } from '@/features/generator/generatorLabels';
import type { DateStep, GeneratedDatePlan } from '@/types/domain';

type DatePlanViewProps = {
  actionMessage?: string;
  isFavorite?: boolean;
  isRemixing?: boolean;
  isSavingFavorite?: boolean;
  onAddToCalendar?: () => void;
  onLockForPartner?: () => void;
  onRemix?: () => void;
  onSave?: () => void;
  plan: GeneratedDatePlan;
  showActions?: boolean;
};

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes === 0 ? `${hours} hr` : `${hours} hr ${remainingMinutes} min`;
}

function formatVibe(vibe: GeneratedDatePlan['vibeTags'][number]) {
  return vibeLabels[vibe] ?? vibe.replaceAll('_', ' ');
}

function StepItem({ step }: { step: DateStep }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text color="textInverse" variant="caption">
          {String(step.sortOrder)}
        </Text>
      </View>
      <View style={styles.stepCopy}>
        <Text variant="bodyStrong">{step.title}</Text>
        <Text color="muted" variant="body">
          {step.description}
        </Text>
        {step.durationMinutes ? (
          <Text color="accent" variant="caption">
            {formatDuration(step.durationMinutes)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function MetadataTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metadataTile}>
      <Text color="muted" variant="overline">
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

export function DatePlanView({
  actionMessage,
  isFavorite,
  isRemixing,
  isSavingFavorite,
  onAddToCalendar,
  onLockForPartner,
  onRemix,
  onSave,
  plan,
  showActions = true,
}: DatePlanViewProps) {
  return (
    <View style={styles.container}>
      <Card padding="lg" style={styles.revealCard} variant="elevated">
        <View style={styles.revealAccent} />
        <View style={styles.revealHeader}>
          <Chip label="Revealed" tone="candlelight" />
          <View style={styles.revealDuration}>
            <Text color="textInverse" variant="caption">
              {formatDuration(plan.estimatedDurationMinutes)}
            </Text>
          </View>
        </View>
        <View style={styles.revealCopy}>
          <Text color="textInverse" variant="display">
            {plan.title}
          </Text>
          <Text color="dustyLavender" variant="body">
            {plan.premise}
          </Text>
        </View>
        <View style={styles.vibeRow}>
          {plan.vibeTags.map((vibe) => (
            <Chip key={vibe} label={formatVibe(vibe)} tone="lavender" />
          ))}
        </View>
      </Card>

      <View style={styles.metadataGrid}>
        <MetadataTile label="Budget" value={plan.estimatedBudgetLabel} />
        <MetadataTile label="Duration" value={formatDuration(plan.estimatedDurationMinutes)} />
        <MetadataTile label="Energy" value={energyLabels[plan.energy]} />
        <MetadataTile label="Location" value={locationLabels[plan.locationMode]} />
      </View>

      <Card padding="lg" style={styles.section} variant="warm">
        <Text variant="subtitle">Food plan</Text>
        <Text color="muted" variant="body">
          {plan.foodPlan}
        </Text>
      </Card>

      <Card padding="lg" style={styles.section} variant="outlined">
        <Text variant="subtitle">Itinerary</Text>
        <View style={styles.stepList}>
          {plan.steps.length > 0 ? (
            plan.steps.map((step) => <StepItem key={step.id} step={step} />)
          ) : (
            <Text color="muted" variant="body">
              The deck did not include steps for this card. Keep it simple and follow the premise.
            </Text>
          )}
        </View>
      </Card>

      <Card padding="lg" style={styles.section} variant="outlined">
        <Text variant="subtitle">Prep list</Text>
        <View style={styles.bulletList}>
          {plan.prepItems.length > 0 ? (
            plan.prepItems.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text color="muted" variant="body">
                  {item}
                </Text>
              </View>
            ))
          ) : (
            <Text color="muted" variant="body">
              No special prep needed.
            </Text>
          )}
        </View>
      </Card>

      <Card padding="lg" style={styles.section} variant="warm">
        <Text variant="subtitle">Twist</Text>
        <Text color="muted" variant="body">
          {plan.twist}
        </Text>
      </Card>

      <Card padding="lg" style={styles.section} variant="outlined">
        <Text color="accent" variant="overline">
          Conversation
        </Text>
        <Text variant="bodyStrong">{plan.conversationPrompt}</Text>
      </Card>

      <Card padding="lg" style={styles.section} variant="outlined">
        <Text variant="subtitle">Backup plan</Text>
        <Text color="muted" variant="body">
          {plan.backupPlan}
        </Text>
      </Card>

      {actionMessage ? (
        <Card padding="md" variant="warm">
          <Text color="muted" variant="body">
            {actionMessage}
          </Text>
        </Card>
      ) : null}

      {showActions ? (
        <Card padding="lg" style={styles.actionCard} variant="elevated">
          <Text variant="subtitle">Actions</Text>
          <View style={styles.actions}>
            {onSave ? (
              <Button
                fullWidth
                loading={isSavingFavorite}
                onPress={onSave}
                title={isFavorite ? 'Unsave' : 'Save'}
                variant={isFavorite ? 'secondary' : 'primary'}
              />
            ) : null}
            {onLockForPartner ? (
              <Button fullWidth onPress={onLockForPartner} title="Lock for partner" variant="outline" />
            ) : null}
            {onAddToCalendar ? (
              <Button fullWidth onPress={onAddToCalendar} title="Add to calendar" variant="secondary" />
            ) : null}
            {onRemix ? (
              <Button fullWidth loading={isRemixing} onPress={onRemix} title="Remix" variant="outline" />
            ) : null}
          </View>
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  revealCard: {
    backgroundColor: colors.midnightPlum,
    gap: spacing.xl,
    overflow: 'hidden',
  },
  revealAccent: {
    backgroundColor: colors.terracotta,
    height: 5,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  revealDuration: {
    backgroundColor: 'rgba(255, 253, 251, 0.12)',
    borderColor: 'rgba(255, 253, 251, 0.16)',
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  revealHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  revealCopy: {
    gap: spacing.md,
  },
  vibeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metadataTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 84,
    padding: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  stepList: {
    gap: spacing.lg,
  },
  stepRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: colors.terracotta,
    borderRadius: radii.full,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  bulletList: {
    gap: spacing.sm,
  },
  bulletRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bullet: {
    backgroundColor: colors.sage,
    borderRadius: radii.full,
    height: 8,
    marginTop: spacing.sm,
    width: 8,
  },
  actionCard: {
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.md,
  },
});
