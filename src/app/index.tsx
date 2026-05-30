// src/app/index.tsx
import { Redirect } from 'expo-router';

import { appRoutes } from '@/constants/routes';

export default function IndexRoute() {
  return <Redirect href={appRoutes.welcome} />;
}

