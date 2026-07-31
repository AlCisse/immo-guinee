'use client';

import SegmentError from '@/components/errors/SegmentError';

// R12 — boundary du segment admin : préserve le layout d'administration
// (nav admin) en cas de crash d'une page, au lieu du error.tsx racine.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError error={error} reset={reset} />;
}