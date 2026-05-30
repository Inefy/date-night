// src/features/remix/remixOptions.ts
import type { RemixReason } from '@/lib/dateGenerator';

export type RemixReasonOption = {
  label: string;
  transitionMessage: string;
  value: RemixReason;
};

export const remixReasonOptions: RemixReasonOption[] = [
  {
    label: 'too expensive',
    transitionMessage: 'Got it — drawing something easier on the budget.',
    value: 'too_expensive',
  },
  {
    label: 'too far',
    transitionMessage: 'Got it — drawing something closer to home.',
    value: 'too_far',
  },
  {
    label: 'too social',
    transitionMessage: 'Got it — drawing something more private.',
    value: 'too_social',
  },
  {
    label: 'too quiet',
    transitionMessage: 'Got it — drawing something with more spark.',
    value: 'too_quiet',
  },
  {
    label: 'too much effort',
    transitionMessage: 'Got it — drawing something lower effort.',
    value: 'too_much_effort',
  },
  {
    label: 'too food-focused',
    transitionMessage: 'Got it — drawing something less food-focused.',
    value: 'too_food_focused',
  },
  {
    label: 'bad weather',
    transitionMessage: 'Got it — drawing something weather-proof.',
    value: 'bad_weather',
  },
  {
    label: 'not our vibe',
    transitionMessage: 'Got it — drawing a different vibe.',
    value: 'not_our_vibe',
  },
  {
    label: 'surprise me again',
    transitionMessage: 'Got it — shuffling the deck again.',
    value: 'surprise_me_again',
  },
];

export const remixReasonLabels = remixReasonOptions.reduce(
  (labels, option) => ({
    ...labels,
    [option.value]: option.label,
  }),
  {} as Record<RemixReason, string>,
);

export function getRemixTransitionMessage(reason: RemixReason) {
  return (
    remixReasonOptions.find((option) => option.value === reason)?.transitionMessage ??
    'Got it — drawing another card.'
  );
}
