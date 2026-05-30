// src/features/generator/generatorLabels.ts
import type {
  BudgetLevel,
  DateVibe,
  EnergyLevel,
  FoodMode,
  LocationMode,
  TalkingLevel,
  WeatherMode,
} from '@/types/domain';

export const budgetOptions: Array<{ label: string; value: BudgetLevel }> = [
  { label: 'Free', value: 'free' },
  { label: 'Low', value: 'low' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Higher', value: 'high' },
];

export const durationOptions = [
  { label: 'Up to 1h', value: 60 },
  { label: 'Up to 90m', value: 90 },
  { label: 'Up to 2h', value: 120 },
  { label: 'Up to 2.5h', value: 150 },
];

export const locationOptions: Array<{ label: string; value: LocationMode }> = [
  { label: 'At home', value: 'at_home' },
  { label: 'Out', value: 'out' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Virtual', value: 'virtual' },
];

export const energyOptions: Array<{ label: string; value: EnergyLevel }> = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

export const vibeOptions: Array<{ label: string; value: DateVibe }> = [
  { label: 'Cozy', value: 'cozy' },
  { label: 'Romantic', value: 'romantic' },
  { label: 'Chaotic', value: 'chaotic' },
  { label: 'Adventure', value: 'adventure' },
  { label: 'Deep', value: 'deep_conversation' },
  { label: 'Funny', value: 'awkward_funny' },
  { label: 'Surprise', value: 'surprise_me' },
  { label: 'Rainy', value: 'rainy_day' },
];

export const foodOptions: Array<{ label: string; value: FoodMode }> = [
  { label: 'No food', value: 'none' },
  { label: 'Snack', value: 'snack' },
  { label: 'Meal', value: 'meal' },
  { label: 'Dessert', value: 'dessert' },
  { label: 'Non-alcoholic drinks', value: 'drinks' },
];

export const weatherOptions: Array<{ label: string; value: WeatherMode }> = [
  { label: 'Indoor', value: 'indoor' },
  { label: 'Outdoor', value: 'outdoor' },
  { label: 'Flexible', value: 'weather_flexible' },
];

export const talkingOptions: Array<{ label: string; value: TalkingLevel }> = [
  { label: 'Quiet', value: 'quiet' },
  { label: 'Light', value: 'light' },
  { label: 'Meaningful', value: 'meaningful' },
  { label: 'Deep', value: 'deep' },
];

export const budgetLabels = Object.fromEntries(
  budgetOptions.map((option) => [option.value, option.label]),
) as Record<BudgetLevel, string>;

export const locationLabels = Object.fromEntries(
  locationOptions.map((option) => [option.value, option.label]),
) as Record<LocationMode, string>;

export const energyLabels = Object.fromEntries(
  energyOptions.map((option) => [option.value, option.label]),
) as Record<EnergyLevel, string>;

export const foodLabels = Object.fromEntries(
  foodOptions.map((option) => [option.value, option.label]),
) as Record<FoodMode, string>;

export const weatherLabels = Object.fromEntries(
  weatherOptions.map((option) => [option.value, option.label]),
) as Record<WeatherMode, string>;

export const talkingLabels = Object.fromEntries(
  talkingOptions.map((option) => [option.value, option.label]),
) as Record<TalkingLevel, string>;

export const vibeLabels = Object.fromEntries(
  vibeOptions.map((option) => [option.value, option.label]),
) as Partial<Record<DateVibe, string>>;
