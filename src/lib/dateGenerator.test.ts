// src/lib/dateGenerator.test.ts
import { describe, expect, it } from 'vitest';

import { generateDatePlan } from './dateGenerator';
import type { DateTemplate } from '../types/domain';

function makeTemplate(overrides: Partial<DateTemplate> & Pick<DateTemplate, 'id' | 'title'>): DateTemplate {
  return {
    id: overrides.id,
    title: overrides.title,
    premise: overrides.premise ?? `${overrides.title} premise.`,
    vibeTags: overrides.vibeTags ?? ['cozy'],
    budget: overrides.budget ?? 'low',
    estimatedDurationMinutes: overrides.estimatedDurationMinutes ?? 60,
    durationRangeMinutes: overrides.durationRangeMinutes ?? { min: 45, max: 75 },
    energy: overrides.energy ?? 'low',
    energyRange: overrides.energyRange ?? ['low'],
    locationMode: overrides.locationMode ?? 'at_home',
    locationModes: overrides.locationModes ?? ['at_home'],
    weatherMode: overrides.weatherMode ?? 'indoor',
    weatherModes: overrides.weatherModes ?? ['indoor'],
    foodMode: overrides.foodMode ?? 'none',
    foodModes: overrides.foodModes ?? ['none'],
    dietaryFlexibility: overrides.dietaryFlexibility ?? ['food_optional'],
    talkingLevel: overrides.talkingLevel ?? 'light',
    prepLevel: overrides.prepLevel ?? 'none',
    steps: overrides.steps ?? [
      {
        id: `${overrides.id}-step-1`,
        title: 'Start',
        description: 'Begin the date.',
        durationMinutes: 10,
        sortOrder: 1,
      },
    ],
    prepItems: overrides.prepItems ?? [],
    conversationPrompts: overrides.conversationPrompts ?? ['What would make this feel good tonight?'],
    twist: overrides.twist ?? 'Add one small surprise.',
    backupPlan: overrides.backupPlan ?? 'Keep the easiest version.',
    createdAt: overrides.createdAt ?? '2026-05-30T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-05-30T00:00:00.000Z',
  };
}

const deterministicOptions = {
  random: () => 0,
};

describe('generateDatePlan', () => {
  it('low energy does not return high-energy templates', () => {
    const plan = generateDatePlan(
      { lowEnergy: true },
      [
        makeTemplate({
          id: 'high-energy',
          title: 'High Energy',
          energy: 'high',
          energyRange: ['high'],
        }),
        makeTemplate({
          id: 'low-energy',
          title: 'Low Energy',
          energy: 'low',
          energyRange: ['low'],
        }),
      ],
      deterministicOptions,
    );

    expect(plan.sourceTemplateId).toBe('low-energy');
    expect(plan.energy).toBe('low');
  });

  it('rainy day avoids outdoor-only templates', () => {
    const plan = generateDatePlan(
      { rainyDay: true },
      [
        makeTemplate({
          id: 'outdoor-only',
          title: 'Outdoor Only',
          weatherMode: 'outdoor',
          weatherModes: ['outdoor'],
        }),
        makeTemplate({
          id: 'indoor-safe',
          title: 'Indoor Safe',
          weatherMode: 'indoor',
          weatherModes: ['indoor'],
        }),
      ],
      deterministicOptions,
    );

    expect(plan.sourceTemplateId).toBe('indoor-safe');
  });

  it('dietary restrictions are respected', () => {
    const plan = generateDatePlan(
      { dietaryCompatibility: ['vegan_adaptable'] },
      [
        makeTemplate({
          id: 'vegetarian-only',
          title: 'Vegetarian Only',
          dietaryFlexibility: ['vegetarian_friendly'],
        }),
        makeTemplate({
          id: 'vegan-adaptable',
          title: 'Vegan Adaptable',
          dietaryFlexibility: ['vegan_adaptable'],
        }),
      ],
      deterministicOptions,
    );

    expect(plan.sourceTemplateId).toBe('vegan-adaptable');
  });

  it('no-talking mode avoids deep conversation templates', () => {
    const plan = generateDatePlan(
      { noTalking: true },
      [
        makeTemplate({
          id: 'deep-conversation',
          title: 'Deep Conversation',
          talkingLevel: 'deep',
          vibeTags: ['deep_conversation'],
        }),
        makeTemplate({
          id: 'quiet-date',
          title: 'Quiet Date',
          talkingLevel: 'quiet',
          vibeTags: ['no_talking'],
        }),
      ],
      deterministicOptions,
    );

    expect(plan.sourceTemplateId).toBe('quiet-date');
  });

  it('remix excludes the previous template', () => {
    const plan = generateDatePlan(
      {},
      [
        makeTemplate({
          id: 'previous-template',
          title: 'Previous Template',
        }),
        makeTemplate({
          id: 'next-template',
          title: 'Next Template',
        }),
      ],
      {
        ...deterministicOptions,
        remix: {
          previousTemplateId: 'previous-template',
          reasons: ['not_our_vibe'],
        },
      },
    );

    expect(plan.sourceTemplateId).toBe('next-template');
  });

  it('scores vibe, energy, budget, and duration matches above weaker candidates', () => {
    const plan = generateDatePlan(
      {
        durationRangeMinutes: { min: 60, max: 90 },
        energy: 'low',
        targetBudget: 'low',
        vibeTags: ['romantic', 'cozy'],
      },
      [
        makeTemplate({
          id: 'weak-match',
          title: 'Weak Match',
          budget: 'splurge',
          durationRangeMinutes: { min: 120, max: 180 },
          energy: 'high',
          energyRange: ['high'],
          estimatedDurationMinutes: 150,
          vibeTags: ['adventure'],
        }),
        makeTemplate({
          id: 'strong-match',
          title: 'Strong Match',
          budget: 'low',
          durationRangeMinutes: { min: 60, max: 90 },
          energy: 'low',
          energyRange: ['low'],
          estimatedDurationMinutes: 75,
          vibeTags: ['romantic', 'cozy'],
        }),
      ],
      { ...deterministicOptions, topCandidateCount: 1 },
    );

    expect(plan.sourceTemplateId).toBe('strong-match');
  });

  it('penalizes recently used templates when scoring otherwise similar matches', () => {
    const plan = generateDatePlan(
      {
        targetBudget: 'low',
        vibeTags: ['cozy'],
      },
      [
        makeTemplate({
          id: 'recent-match',
          title: 'Recent Match',
          vibeTags: ['cozy'],
        }),
        makeTemplate({
          id: 'fresh-match',
          title: 'Fresh Match',
          vibeTags: ['cozy'],
        }),
      ],
      {
        ...deterministicOptions,
        recentlyUsedTemplateIds: ['recent-match'],
        topCandidateCount: 1,
      },
    );

    expect(plan.sourceTemplateId).toBe('fresh-match');
  });

  it('falls back by relaxing duration but keeps dietary safety requirements', () => {
    const plan = generateDatePlan(
      {
        dietaryCompatibility: ['vegan_adaptable'],
        maxDurationMinutes: 30,
      },
      [
        makeTemplate({
          id: 'short-unsafe',
          title: 'Short Unsafe',
          dietaryFlexibility: ['vegetarian_friendly'],
          estimatedDurationMinutes: 20,
        }),
        makeTemplate({
          id: 'long-safe',
          title: 'Long Safe',
          dietaryFlexibility: ['vegan_adaptable'],
          estimatedDurationMinutes: 90,
        }),
      ],
      deterministicOptions,
    );

    expect(plan.sourceTemplateId).toBe('long-safe');
  });

  it('remix with too_expensive selects a lower-budget option', () => {
    const plan = generateDatePlan(
      {},
      [
        makeTemplate({
          id: 'previous-template',
          title: 'Previous Template',
          budget: 'moderate',
        }),
        makeTemplate({
          id: 'still-pricey',
          title: 'Still Pricey',
          budget: 'high',
        }),
        makeTemplate({
          id: 'lower-budget',
          title: 'Lower Budget',
          budget: 'low',
        }),
      ],
      {
        ...deterministicOptions,
        remix: {
          previousTemplateId: 'previous-template',
          reasons: ['too_expensive'],
        },
      },
    );

    expect(plan.sourceTemplateId).toBe('lower-budget');
  });

  it('remix with too_far keeps the next draw at home or hybrid', () => {
    const plan = generateDatePlan(
      {},
      [
        makeTemplate({
          id: 'out-date',
          title: 'Out Date',
          locationMode: 'out',
          locationModes: ['out'],
        }),
        makeTemplate({
          id: 'home-date',
          title: 'Home Date',
          locationMode: 'at_home',
          locationModes: ['at_home'],
        }),
      ],
      {
        ...deterministicOptions,
        remix: {
          previousTemplateId: 'previous-template',
          reasons: ['too_far'],
        },
      },
    );

    expect(plan.sourceTemplateId).toBe('home-date');
    expect(plan.locationMode).toBe('at_home');
  });

  it('remix with too_food_focused favors a non-meal plan', () => {
    const plan = generateDatePlan(
      {},
      [
        makeTemplate({
          id: 'meal-date',
          title: 'Meal Date',
          foodMode: 'meal',
          foodModes: ['meal'],
        }),
        makeTemplate({
          id: 'non-food-date',
          title: 'Non Food Date',
          foodMode: 'none',
          foodModes: ['none'],
        }),
      ],
      {
        ...deterministicOptions,
        remix: {
          previousTemplateId: 'previous-template',
          reasons: ['too_food_focused'],
        },
        topCandidateCount: 1,
      },
    );

    expect(plan.sourceTemplateId).toBe('non-food-date');
    expect(plan.foodPlan).toBe('No food required.');
  });
});
