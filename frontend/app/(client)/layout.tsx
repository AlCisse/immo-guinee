'use client';

import Navbar from '@/components/layout/Navbar';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      {/* Shared Navbar - Persistent across all pages, never reloads */}
      <Navbar variant="full" />

      {/* Main Content */}
      <main className="pt-14 md:pt-16 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
