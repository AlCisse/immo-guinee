'use client';

import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/Spinner';

// Dynamic import to avoid SSG issues with useSearchParams
const ContractGeneratorContent = dynamic(
  () => import('./ContractGeneratorContent'),
  {
    loading: () => (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    ),
    ssr: false,
  }
);

export default function ContractGeneratePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ContractGeneratorContent />
    </div>
  );
}
