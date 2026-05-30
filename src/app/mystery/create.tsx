// src/app/mystery/create.tsx
import { RequireAuth } from '@/features/auth/RequireAuth';
import { MysteryCreateScreen as MysteryCreateFeatureScreen } from '@/features/mystery/MysteryCreateScreen';

export default function MysteryCreateScreen() {
  return (
    <RequireAuth message="Sign in to lock and share a mystery date with your partner.">
      <MysteryCreateFeatureScreen />
    </RequireAuth>
  );
}
