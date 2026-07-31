'use client';

import SegmentError from '@/components/errors/SegmentError';

// R12 — boundary du segment auth (favoris, profil, mes-annonces, paramètres
// hors dashboard) : préserve le layout auth en cas de crash d'une page.
export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError error={error} reset={reset} />;
}