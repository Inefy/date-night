// src/components/DateCardBack.tsx
import { StyleSheet, View } from 'react-native';

import { Card, Chip, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';

type DateCardBackProps = {
  conversationPrompt?: string;
  items?: string[];
  note?: string;
  title?: string;
};

export function DateCardBack({
  conversationPrompt = 'What small ritual would make regular weeknights feel more intentional?',
  items = ['Choose one shared activity', 'Set phones aside', 'Pick a shared playlist'],
  note = 'Keep it simple enough to repeat on a busy night.',
  title = 'How to Play It',
}: DateCardBackProps) {
  return (
    <Card accessibilityLabel={`Date card back: ${title}`} padding="lg" style={styles.card} variant="warm">
      <View style={styles.header}>
        <Chip label="Card Back" tone="lavender" />
        <Text variant="title">{title}</Text>
      </View>
      <View style={styles.list}>
        {items.map((item) => (
          <View key={item} style={styles.listItem}>
            <View style={styles.bullet} />
            <Text variant="body">{item}</Text>
          </View>
        ))}
      </View>
      <View style={styles.prompt}>
        <Text color="midnightPlum" variant="overline">
          Conversation
        </Text>
        <Text color="midnightPlum" variant="bodyStrong">
          {conversationPrompt}
        </Text>
      </View>
      <Text color="muted" variant="caption">
        {note}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  header: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  listItem: {
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
  prompt: {
    backgroundColor: colors.candlelight,
    borderColor: '#F0C456',
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
});
