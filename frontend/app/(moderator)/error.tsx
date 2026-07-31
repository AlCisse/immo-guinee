'use client';

import SegmentError from '@/components/errors/SegmentError';

// R12 — boundary du segment modérateur : préserve le layout de modération
// en cas de crash d'une page (file de modération, détail annonce...).
export default function ModeratorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError error={error} reset={reset} />;
}