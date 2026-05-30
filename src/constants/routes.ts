// src/constants/routes.ts
export const appRoutes = {
  welcome: '/welcome',
  signIn: '/sign-in',
  preferences: '/onboarding/preferences',
  coupleSetup: '/onboarding/couple-setup',
  home: '/tabs/home',
  favorites: '/tabs/favorites',
  couple: '/tabs/couple',
  settings: '/tabs/settings',
  dateDetail: '/date/[id]',
  mysteryCreate: '/mystery/create',
  mysteryReveal: '/mystery/[token]',
} as const;

export type AppRoute = (typeof appRoutes)[keyof typeof appRoutes];

