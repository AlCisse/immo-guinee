'use client';

import SegmentError from '@/components/errors/SegmentError';

// R12 — boundary du segment dashboard : préserve la sidebar
// (DashboardSidebar) en cas de crash d'une page (annonces, favoris,
// messagerie...) plutôt que de tomber sur le error.tsx racine plein écran.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError error={error} reset={reset} />;
}