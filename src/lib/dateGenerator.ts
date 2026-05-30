// src/lib/dateGenerator.ts
import {
  budgetLevels,
  energyLevels,
  prepLevels,
  type BudgetLevel,
  type DateFilters,
  type DateStep,
  type DateTemplate,
  type DateVibe,
  type DietaryFlexibility,
  type DurationRangeMinutes,
  type EnergyLevel,
  type EntityId,
  type FoodMode,
  type GeneratedDatePlan,
  type LocationMode,
  type PrepLevel,
  type TalkingLevel,
  type WeatherMode,
} from '../types/domain';

export type RemixReason =
  | 'too_expensive'
  | 'too_far'
  | 'too_social'
  | 'too_quiet'
  | 'too_much_effort'
  | 'too_food_focused'
  | 'not_our_vibe'
  | 'bad_weather'
  | 'surprise_me_again';

export type DateGenerationFilters = Omit<
  DateFilters,
  | 'budget'
  | 'dietaryFlexibility'
  | 'durationRangeMinutes'
  | 'energy'
  | 'foodMode'
  | 'locationMode'
  | 'prepLevel'
  | 'talkingLevel'
  | 'weatherMode'
> & {
  dietaryCompatibility?: DietaryFlexibility[];
  dietaryFlexibility?: DietaryFlexibility[];
  durationRangeMinutes?: DurationRangeMinutes;
  energy?: EnergyLevel;
  foodMode?: FoodMode | FoodMode[];
  indoorOnly?: boolean;
  locationMode?: LocationMode | LocationMode[];
  lowEnergy?: boolean;
  maxBudget?: BudgetLevel;
  maxPrepLevel?: PrepLevel;
  noTalking?: boolean;
  prepLevel?: PrepLevel | PrepLevel[];
  rainyDay?: boolean;
  talkingLevel?: TalkingLevel | TalkingLevel[];
  targetBudget?: BudgetLevel;
  weatherMode?: WeatherMode | WeatherMode[];
};

export type DateRemixOptions = {
  previousTemplateId?: EntityId;
  reasons?: RemixReason[];
};

export type DateGenerationOptions = {
  random?: () => number;
  recentlyUsedTemplateIds?: EntityId[];
  remix?: DateRemixOptions;
  seed?: string;
  seenTemplateIds?: EntityId[];
  topCandidateCount?: number;
};

type HardRelaxation = {
  relaxBudget?: boolean;
  relaxDuration?: boolean;
  relaxEnergy?: boolean;
  relaxLocation?: boolean;
  relaxPrep?: boolean;
  relaxTalking?: boolean;
  relaxWeather?: boolean;
};

type ScoredTemplate = {
  score: number;
  template: DateTemplate;
};

type GenerationContext = {
  desiredEnergy?: EnergyLevel;
  desiredVibes: readonly DateVibe[];
  dietaryRequirements: readonly DietaryFlexibility[];
  foodModes: readonly FoodMode[];
  locationModes: readonly LocationMode[];
  needsIndoor: boolean;
  previousTemplate?: DateTemplate;
  previousTemplateId?: EntityId;
  recentTemplateIds: ReadonlySet<EntityId>;
  requestedWeatherModes: readonly WeatherMode[];
  seenTemplateIds: ReadonlySet<EntityId>;
  targetBudget?: BudgetLevel;
  wantsLowEnergy: boolean;
  wantsNoTalking: boolean;
};

const budgetLabels: Record<BudgetLevel, string> = {
  free: 'Free',
  low: 'Low cost',
  moderate: 'Moderate',
  high: 'Higher budget',
  splurge: 'Flexible budget',
};

const foodPlanByMode: Record<FoodMode, string> = {
  none: 'No food required.',
  snack: 'Plan for a snack, small shared plate, or a non-food pause.',
  meal: 'Plan for a flexible meal that fits both people, or swap in a shared activity if food is not a fit.',
  dessert: 'Plan for dessert, fruit, or a non-food sweet finish like a favorite song.',
  drinks: 'Plan for a non-alcoholic drink, tea, coffee, water break, or quiet pause.',
};

const fallbackStages: HardRelaxation[] = [
  {},
  { relaxDuration: true },
  { relaxDuration: true, relaxBudget: true },
  { relaxDuration: true, relaxBudget: true, relaxLocation: true },
  { relaxDuration: true, relaxBudget: true, relaxLocation: true, relaxWeather: true },
  { relaxDuration: true, relaxBudget: true, relaxLocation: true, relaxWeather: true, relaxEnergy: true },
  {
    relaxBudget: true,
    relaxDuration: true,
    relaxEnergy: true,
    relaxLocation: true,
    relaxTalking: true,
    relaxWeather: true,
  },
  {
    relaxBudget: true,
    relaxDuration: true,
    relaxEnergy: true,
    relaxLocation: true,
    relaxPrep: true,
    relaxTalking: true,
    relaxWeather: true,
  },
];

export function generateDatePlan(
  filters: DateGenerationFilters = {},
  templates: readonly DateTemplate[],
  options: DateGenerationOptions = {},
): GeneratedDatePlan {
  if (templates.length === 0) {
    throw new Error('No date templates are available.');
  }

  const remixReasons = options.remix?.reasons ?? [];
  const previousTemplateId = options.remix?.previousTemplateId;
  const previousTemplate = templates.find((template) => template.id === previousTemplateId);
  const adjustedFilters = applyRemixFilterDefaults(filters, previousTemplate, remixReasons);
  const context = createGenerationContext(adjustedFilters, options, remixReasons, previousTemplate);
  const random = options.random ?? Math.random;
  const candidates = getFallbackCandidates(adjustedFilters, templates, context);

  if (candidates.length === 0) {
    throw new Error('No date templates match dietary safety requirements.');
  }

  const scored = candidates
    .map((template) => ({
      template,
      score: scoreTemplate(template, adjustedFilters, remixReasons, context),
    }))
    .sort((a, b) => b.score - a.score);

  const topCandidates = getTopCandidates(scored, options.topCandidateCount ?? 5);
  const selected = pickRandom(topCandidates, random).template;
  const prompt = pickRandom(selected.conversationPrompts, random);
  const seed = options.seed ?? `${selected.id}:${Math.floor(clampRandom(random()) * 1_000_000).toString(36)}`;

  return assembleGeneratedPlan(selected, prompt, seed);
}

function applyRemixFilterDefaults(
  filters: DateGenerationFilters,
  previousTemplate: DateTemplate | undefined,
  reasons: readonly RemixReason[],
): DateGenerationFilters {
  const nextFilters = { ...filters };

  if (reasons.includes('too_expensive') && !nextFilters.maxBudget && previousTemplate) {
    nextFilters.maxBudget = lowerBudget(previousTemplate.budget);
  }

  if (reasons.includes('bad_weather')) {
    nextFilters.rainyDay = true;
  }

  if (reasons.includes('too_far') && !nextFilters.locationMode) {
    nextFilters.locationMode = ['at_home', 'hybrid'];
  }

  if (reasons.includes('too_social') && !nextFilters.talkingLevel) {
    nextFilters.talkingLevel = ['quiet', 'light'];
  }

  if (reasons.includes('too_quiet') && !nextFilters.talkingLevel) {
    nextFilters.talkingLevel = ['meaningful', 'deep'];
  }

  if (reasons.includes('too_much_effort') && !nextFilters.maxPrepLevel) {
    nextFilters.maxPrepLevel = 'light';
  }

  if (reasons.includes('too_food_focused') && !nextFilters.foodMode) {
    nextFilters.foodMode = ['none', 'snack', 'drinks'];
  }

  return nextFilters;
}

function createGenerationContext(
  filters: DateGenerationFilters,
  options: DateGenerationOptions,
  remixReasons: readonly RemixReason[],
  previousTemplate: DateTemplate | undefined,
): GenerationContext {
  const requestedWeatherModes = toArray(filters.weatherMode);
  const requestedTalkingLevels = toArray(filters.talkingLevel);

  return {
    desiredEnergy: getDesiredEnergy(filters),
    desiredVibes: filters.vibeTags ?? [],
    dietaryRequirements: getDietaryRequirements(filters),
    foodModes: toArray(filters.foodMode),
    locationModes: toArray(filters.locationMode),
    needsIndoor:
      Boolean(filters.rainyDay || filters.indoorOnly || remixReasons.includes('bad_weather')) ||
      requestedWeatherModes.includes('indoor'),
    previousTemplate,
    previousTemplateId: options.remix?.previousTemplateId,
    recentTemplateIds: new Set(options.recentlyUsedTemplateIds ?? []),
    requestedWeatherModes,
    seenTemplateIds: new Set(options.seenTemplateIds ?? []),
    targetBudget: filters.targetBudget ?? filters.maxBudget,
    wantsLowEnergy: wantsLowEnergy(filters),
    wantsNoTalking:
      Boolean(filters.noTalking || filters.vibeTags?.includes('no_talking')) ||
      requestedTalkingLevels.includes('quiet'),
  };
}

function getFallbackCandidates(
  filters: DateGenerationFilters,
  templates: readonly DateTemplate[],
  context: GenerationContext,
): DateTemplate[] {
  for (const stage of fallbackStages) {
    const candidates = templates.filter((template) => passesHardFilters(template, filters, context, stage));

    if (candidates.length > 0) {
      return candidates;
    }
  }

  return [];
}

function passesHardFilters(
  template: DateTemplate,
  filters: DateGenerationFilters,
  context: GenerationContext,
  relaxation: HardRelaxation,
): boolean {
  if (template.id === context.previousTemplateId) {
    return false;
  }

  if (!matchesDietarySafety(template, context.dietaryRequirements)) {
    return false;
  }

  if (!relaxation.relaxBudget && filters.maxBudget && compareRank(template.budget, filters.maxBudget, budgetLevels) > 0) {
    return false;
  }

  if (!relaxation.relaxDuration && filters.maxDurationMinutes && template.estimatedDurationMinutes > filters.maxDurationMinutes) {
    return false;
  }

  if (!relaxation.relaxLocation && context.locationModes.length > 0 && !hasOverlap(template.locationModes, context.locationModes)) {
    return false;
  }

  if (!relaxation.relaxWeather && !matchesWeatherMode(template, context)) {
    return false;
  }

  if (!relaxation.relaxEnergy && context.wantsLowEnergy && !matchesLowEnergy(template)) {
    return false;
  }

  if (!relaxation.relaxTalking && context.wantsNoTalking && !matchesNoTalking(template)) {
    return false;
  }

  if (!relaxation.relaxPrep && filters.maxPrepLevel && compareRank(template.prepLevel, filters.maxPrepLevel, prepLevels) > 0) {
    return false;
  }

  return true;
}

function scoreTemplate(
  template: DateTemplate,
  filters: DateGenerationFilters,
  remixReasons: readonly RemixReason[],
  context: GenerationContext,
): number {
  let score = 0;
  const vibeOverlap = countOverlap(template.vibeTags, context.desiredVibes);

  if (context.desiredVibes.length > 0) {
    score += vibeOverlap * 12;
    score += (vibeOverlap / context.desiredVibes.length) * 8;
    score -= vibeOverlap === 0 ? 4 : 0;
  }

  if (context.desiredEnergy) {
    score += (2 - Math.min(2, rankDistance(template.energy, context.desiredEnergy, energyLevels))) * 5;
  }

  if (context.targetBudget) {
    const budgetDistance = rankDistance(template.budget, context.targetBudget, budgetLevels);
    score += Math.max(0, 7 - budgetDistance * 2);
  }

  if (filters.maxDurationMinutes) {
    const durationRatio = template.estimatedDurationMinutes / filters.maxDurationMinutes;
    score += durationRatio <= 1 ? Math.max(0, 8 - Math.abs(0.8 - durationRatio) * 6) : -12;
  }

  if (filters.durationRangeMinutes) {
    score += rangesOverlap(template.durationRangeMinutes, filters.durationRangeMinutes) ? 6 : -3;
  }

  if (context.foodModes.length > 0 && hasOverlap(template.foodModes, context.foodModes)) {
    score += 3;
  }

  if (context.locationModes.length > 0 && hasOverlap(template.locationModes, context.locationModes)) {
    score += 4;
  }

  if (filters.rainyDay && template.vibeTags.includes('rainy_day')) {
    score += 4;
  }

  if (context.wantsNoTalking && template.talkingLevel === 'quiet') {
    score += 6;
  }

  if (context.seenTemplateIds.has(template.id)) {
    score -= 4;
  } else {
    score += 3;
  }

  if (context.recentTemplateIds.has(template.id)) {
    score -= 14;
  } else {
    score += 6;
  }

  score += scoreRemix(template, filters, remixReasons, context);

  return score;
}

function scoreRemix(
  template: DateTemplate,
  filters: DateGenerationFilters,
  reasons: readonly RemixReason[],
  context: GenerationContext,
): number {
  let score = 0;

  if (reasons.includes('too_expensive')) {
    score += compareRank(template.budget, filters.maxBudget ?? 'moderate', budgetLevels) <= 0 ? 5 : -8;
  }

  if (reasons.includes('too_far')) {
    score += template.locationModes.includes('at_home') || template.locationModes.includes('hybrid') ? 7 : -6;
  }

  if (reasons.includes('too_social')) {
    score += template.talkingLevel === 'quiet' || template.talkingLevel === 'light' ? 6 : -8;
  }

  if (reasons.includes('too_quiet')) {
    score += template.talkingLevel === 'meaningful' || template.talkingLevel === 'deep' ? 6 : -5;
  }

  if (reasons.includes('too_much_effort')) {
    score += template.prepLevel === 'none' || template.prepLevel === 'light' ? 6 : -6;
  }

  if (reasons.includes('too_food_focused')) {
    score += template.foodMode === 'none' || template.foodMode === 'snack' || template.foodMode === 'drinks' ? 7 : -7;
  }

  if (reasons.includes('bad_weather')) {
    score += template.weatherModes.includes('indoor') || template.weatherModes.includes('weather_flexible') ? 7 : -10;
  }

  if (reasons.includes('not_our_vibe') && context.previousTemplate) {
    score -= countOverlap(template.vibeTags, context.previousTemplate.vibeTags) * 3;
  }

  if (reasons.includes('surprise_me_again') && context.previousTemplate) {
    score += template.id === context.previousTemplateId ? -20 : 3;
    score -= countOverlap(template.vibeTags, context.previousTemplate.vibeTags) * 2;
  }

  return score;
}

function assembleGeneratedPlan(template: DateTemplate, conversationPrompt: string, seed: string): GeneratedDatePlan {
  const stepSummary = template.steps.map((step) => `${step.sortOrder}. ${step.title}: ${step.description}`).join('\n');
  const prepSummary = template.prepItems.length > 0 ? template.prepItems.join(', ') : 'No special prep.';

  return {
    title: template.title,
    premise: template.premise,
    vibeTags: template.vibeTags,
    estimatedBudgetLabel: budgetLabels[template.budget],
    estimatedDurationMinutes: template.estimatedDurationMinutes,
    energy: template.energy,
    locationMode: template.locationMode,
    foodPlan: foodPlanByMode[template.foodMode],
    steps: cloneSteps(template.steps),
    prepItems: [...template.prepItems],
    twist: template.twist,
    conversationPrompt,
    backupPlan: template.backupPlan,
    calendarTitle: `Date Night: ${template.title}`,
    calendarDescription: `${template.premise}\n\nSteps:\n${stepSummary}\n\nPrep: ${prepSummary}\n\nBackup: ${template.backupPlan}`,
    shareTeaser: `Tonight's deck picked "${template.title}" - ${template.premise}`,
    sourceTemplateId: template.id,
    seed,
  };
}

function matchesDietarySafety(template: DateTemplate, requirements: readonly DietaryFlexibility[]): boolean {
  if (requirements.length === 0) {
    return true;
  }

  return requirements.every(
    (requirement) =>
      template.dietaryFlexibility.includes(requirement) ||
      template.dietaryFlexibility.includes('food_optional') ||
      template.dietaryFlexibility.includes('bring_your_own'),
  );
}

function matchesWeatherMode(
  template: DateTemplate,
  context: GenerationContext,
): boolean {
  if (context.needsIndoor) {
    return template.weatherModes.includes('indoor') || template.weatherModes.includes('weather_flexible');
  }

  if (context.requestedWeatherModes.includes('outdoor')) {
    return template.weatherModes.includes('outdoor') || template.weatherModes.includes('weather_flexible');
  }

  return true;
}

function matchesLowEnergy(template: DateTemplate): boolean {
  return template.energy !== 'high' && template.energyRange.includes('low');
}

function matchesNoTalking(template: DateTemplate): boolean {
  return template.talkingLevel !== 'deep' && !template.vibeTags.includes('deep_conversation');
}

function wantsLowEnergy(filters: DateGenerationFilters): boolean {
  return Boolean(filters.lowEnergy || filters.energy === 'low' || filters.vibeTags?.includes('low_energy'));
}

function wantsNoTalking(filters: DateGenerationFilters): boolean {
  const requestedTalkingLevels = toArray(filters.talkingLevel);

  return Boolean(filters.noTalking || requestedTalkingLevels.includes('quiet') || filters.vibeTags?.includes('no_talking'));
}

function getDesiredEnergy(filters: DateGenerationFilters): EnergyLevel | undefined {
  if (wantsLowEnergy(filters)) {
    return 'low';
  }

  return filters.energy;
}

function getDietaryRequirements(filters: DateGenerationFilters): DietaryFlexibility[] {
  return filters.dietaryCompatibility ?? filters.dietaryFlexibility ?? [];
}

function getTopCandidates(scored: ScoredTemplate[], topCandidateCount: number): ScoredTemplate[] {
  const bestScore = scored[0]?.score ?? 0;
  const scoreBand = scored.filter((candidate) => candidate.score >= bestScore - 6);

  return scoreBand.slice(0, Math.max(1, topCandidateCount));
}

function pickRandom<T>(items: readonly T[], random: () => number): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from an empty collection.');
  }

  return items[Math.min(items.length - 1, Math.floor(clampRandom(random()) * items.length))];
}

function clampRandom(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(0.999_999, Math.max(0, value));
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function hasOverlap<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.some((item) => right.includes(item));
}

function countOverlap<T>(left: readonly T[], right: readonly T[]): number {
  return left.filter((item) => right.includes(item)).length;
}

function rangesOverlap(left: DurationRangeMinutes, right: DurationRangeMinutes): boolean {
  return left.min <= right.max && right.min <= left.max;
}

function rankDistance<T extends string>(left: T, right: T, order: readonly T[]): number {
  return Math.abs(order.indexOf(left) - order.indexOf(right));
}

function compareRank<T extends string>(left: T, right: T, order: readonly T[]): number {
  return order.indexOf(left) - order.indexOf(right);
}

function lowerBudget(budget: BudgetLevel): BudgetLevel {
  const currentIndex = budgetLevels.indexOf(budget);

  return budgetLevels[Math.max(0, currentIndex - 1)];
}

function cloneSteps(steps: readonly DateStep[]): DateStep[] {
  return steps.map((step) => ({ ...step }));
}
