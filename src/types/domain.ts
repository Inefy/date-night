// src/types/domain.ts
export type EntityId = string;
export type ISODateString = string;
export type ISODateTimeString = string;

export const budgetLevels = ['free', 'low', 'moderate', 'high', 'splurge'] as const;
export type BudgetLevel = (typeof budgetLevels)[number];

export const energyLevels = ['low', 'medium', 'high'] as const;
export type EnergyLevel = (typeof energyLevels)[number];

export const locationModes = ['at_home', 'out', 'hybrid', 'virtual'] as const;
export type LocationMode = (typeof locationModes)[number];

export const weatherModes = ['indoor', 'outdoor', 'weather_flexible'] as const;
export type WeatherMode = (typeof weatherModes)[number];

export const foodModes = ['none', 'snack', 'meal', 'dessert', 'drinks'] as const;
export type FoodMode = (typeof foodModes)[number];

export const talkingLevels = ['quiet', 'light', 'meaningful', 'deep'] as const;
export type TalkingLevel = (typeof talkingLevels)[number];

export const revealStyles = ['deck_flip', 'sealed_envelope', 'scratch_card'] as const;
export type RevealStyle = (typeof revealStyles)[number];

export const dateVibes = [
  'cozy',
  'chaotic',
  'cheap',
  'romantic',
  'playful',
  'first_date',
  'in_a_rut',
  'rainy_day',
  'anniversary_rescue',
  'low_energy',
  'no_talking',
  'deep_conversation',
  'stay_at_home',
  'adventure',
  'awkward_funny',
  'surprise_me',
  'adventurous',
  'creative',
  'reflective',
  'celebratory',
  'low_key',
  'spontaneous',
] as const;
export type DateVibe = (typeof dateVibes)[number];

export type DurationRangeMinutes = {
  min: number;
  max: number;
};

export const prepLevels = ['none', 'light', 'medium', 'planned'] as const;
export type PrepLevel = (typeof prepLevels)[number];

export const dietaryFlexibilityModes = [
  'food_optional',
  'vegetarian_friendly',
  'vegan_adaptable',
  'gluten_free_adaptable',
  'allergy_adaptable',
  'bring_your_own',
] as const;
export type DietaryFlexibility = (typeof dietaryFlexibilityModes)[number];

export type CoupleMemberRole = 'primary' | 'partner';

export type CoupleMember = {
  id: EntityId;
  userId: EntityId;
  displayName: string;
  role: CoupleMemberRole;
  joinedAt: ISODateTimeString;
};

export type UserProfile = {
  id: EntityId;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  timezone?: string;
  preferredBudget?: BudgetLevel;
  preferredDietaryFlexibility?: DietaryFlexibility[];
  preferredDurationMinutes?: number;
  preferredEnergy?: EnergyLevel;
  preferredFoodModes?: FoodMode[];
  preferredLocationMode?: LocationMode;
  preferredVibes?: DateVibe[];
  rainyIndoorPreference?: WeatherMode;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
};

export type Couple = {
  id: EntityId;
  name?: string;
  defaultPreferences?: {
    defaultBudget?: BudgetLevel;
    defaultDurationMinutes?: number;
    defaultEnergy?: EnergyLevel;
    defaultLocationMode?: LocationMode;
    dietaryPreferences?: DietaryFlexibility[];
    foodPreferences?: FoodMode[];
    preferredVibes?: DateVibe[];
    rainyIndoorPreference?: WeatherMode;
  };
  members: [CoupleMember, CoupleMember] | CoupleMember[];
  inviteCode?: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
};

export type DateFilters = {
  budget?: BudgetLevel[];
  dietaryFlexibility?: DietaryFlexibility[];
  durationRangeMinutes?: DurationRangeMinutes;
  energy?: EnergyLevel[];
  locationMode?: LocationMode[];
  prepLevel?: PrepLevel[];
  weatherMode?: WeatherMode[];
  foodMode?: FoodMode[];
  talkingLevel?: TalkingLevel[];
  vibeTags?: DateVibe[];
  maxDurationMinutes?: number;
  includeFavoritesOnly?: boolean;
};

export type DateStep = {
  id: EntityId;
  title: string;
  description: string;
  durationMinutes?: number;
  locationHint?: string;
  sortOrder: number;
};

export type DateTemplate = {
  id: EntityId;
  title: string;
  premise: string;
  vibeTags: DateVibe[];
  budget: BudgetLevel;
  estimatedDurationMinutes: number;
  durationRangeMinutes: DurationRangeMinutes;
  energy: EnergyLevel;
  energyRange: EnergyLevel[];
  locationMode: LocationMode;
  locationModes: LocationMode[];
  weatherMode: WeatherMode;
  weatherModes: WeatherMode[];
  foodMode: FoodMode;
  foodModes: FoodMode[];
  dietaryFlexibility: DietaryFlexibility[];
  talkingLevel: TalkingLevel;
  prepLevel: PrepLevel;
  steps: DateStep[];
  prepItems: string[];
  conversationPrompts: string[];
  twist: string;
  backupPlan: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
};

export type GeneratedDatePlan = {
  title: string;
  premise: string;
  vibeTags: DateVibe[];
  estimatedBudgetLabel: string;
  estimatedDurationMinutes: number;
  energy: EnergyLevel;
  locationMode: LocationMode;
  foodPlan: string;
  steps: DateStep[];
  prepItems: string[];
  twist: string;
  conversationPrompt: string;
  backupPlan: string;
  calendarTitle: string;
  calendarDescription: string;
  shareTeaser: string;
  sourceTemplateId: EntityId;
  seed: string;
};

export type MysteryDate = {
  id: EntityId;
  coupleId: EntityId;
  token: string;
  revealStyle: RevealStyle;
  plan: GeneratedDatePlan;
  teaser: string;
  revealAt?: ISODateTimeString;
  revealedAt?: ISODateTimeString;
  expiresAt?: ISODateTimeString;
  createdAt: ISODateTimeString;
};

export type FavoriteDate = {
  id: EntityId;
  userId: EntityId;
  coupleId?: EntityId;
  plan: GeneratedDatePlan;
  sourceTemplateId?: EntityId;
  favoritedAt: ISODateTimeString;
  note?: string;
};

export const dateFeedbackRatings = ['liked', 'neutral', 'disliked'] as const;
export type DateFeedbackRating = (typeof dateFeedbackRatings)[number];

export type DateFeedback = {
  id: EntityId;
  userId: EntityId;
  coupleId?: EntityId;
  planSeed: string;
  sourceTemplateId?: EntityId;
  rating: DateFeedbackRating;
  budgetFit?: BudgetLevel;
  energyFit?: EnergyLevel;
  wouldRepeat?: boolean;
  notes?: string;
  createdAt: ISODateTimeString;
};

export const domainOptions = {
  budgetLevels,
  energyLevels,
  locationModes,
  weatherModes,
  foodModes,
  talkingLevels,
  revealStyles,
  dateVibes,
  prepLevels,
  dietaryFlexibilityModes,
  dateFeedbackRatings,
} as const;
