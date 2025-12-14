'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSG issues with useState/framer-motion
const AnnoncesContent = dynamic(
  () => import('./AnnoncesContent'),
  {
    loading: () => (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    ),
    ssr: false,
  }
);

export default function AnnoncesPage() {
  return <AnnoncesContent />;
}
