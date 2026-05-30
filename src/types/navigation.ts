// src/types/navigation.ts
import type { AppRoute } from '@/constants/routes';

export type PlaceholderScreen = {
  route: AppRoute;
  title: string;
  subtitle?: string;
};

