'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSG issues with useState/useQuery/framer-motion
const VisitsContent = dynamic(
  () => import('./VisitsContent'),
  {
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    ),
    ssr: false,
  }
);

export default function VisitsCalendarPage() {
  return <VisitsContent />;
}
