'use client';

import SegmentError from '@/components/errors/SegmentError';

// R12 — boundary du segment client (recherche, fiche bien, HomeClient) :
// préserve le layout client (header/nav) en cas de crash, au lieu du
// error.tsx racine plein écran.
export default function ClientError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError error={error} reset={reset} />;
}