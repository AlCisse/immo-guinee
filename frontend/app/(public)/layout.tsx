'use client';

import Navbar from '@/components/layout/Navbar';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      {/* Minimal Navbar - Only shows logo and home link */}
      <Navbar variant="minimal" />

      {/* Main Content */}
      <main className="pt-14 md:pt-16">
        {children}
      </main>
    </div>
  );
}
