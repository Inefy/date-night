// src/app/tabs/favorites.tsx
import { RequireAuth } from '@/features/auth/RequireAuth';
import { FavoritesScreen as FavoritesFeatureScreen } from '@/features/favorites/FavoritesScreen';

export default function FavoritesScreen() {
  return (
    <RequireAuth message="Sign in to save and revisit favorite date cards.">
      <FavoritesFeatureScreen />
    </RequireAuth>
  );
}
