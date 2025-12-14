'use client';

import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/Spinner';

// Dynamic import to avoid SSG issues with useState/useQuery
const PaymentsContent = dynamic(
  () => import('./PaymentsContent'),
  {
    loading: () => (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    ),
    ssr: false,
  }
);

export default function MyPaymentsPage() {
  return <PaymentsContent />;
}
