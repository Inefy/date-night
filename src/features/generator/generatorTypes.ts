// src/features/generator/generatorTypes.ts
import type {
  BudgetLevel,
  DateVibe,
  EnergyLevel,
  FoodMode,
  LocationMode,
  TalkingLevel,
  WeatherMode,
} from '@/types/domain';

export type GeneratorFilterState = {
  energy?: EnergyLevel;
  foodMode?: FoodMode;
  locationMode?: LocationMode;
  maxBudget?: BudgetLevel;
  maxDurationMinutes?: number;
  noTalking?: boolean;
  rainyDay?: boolean;
  talkingLevel?: TalkingLevel;
  vibe?: DateVibe;
  weatherMode?: WeatherMode;
};

