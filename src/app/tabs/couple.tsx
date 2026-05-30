// src/app/tabs/couple.tsx
import { RequireAuth } from '@/features/auth/RequireAuth';
import { CoupleProfileScreen } from '@/features/couple/CoupleProfileScreen';

export default function CoupleScreen() {
  return (
    <RequireAuth message="Sign in to create or join a couple deck.">
      <CoupleProfileScreen />
    </RequireAuth>
  );
}
