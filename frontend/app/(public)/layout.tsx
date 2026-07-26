'use client';

import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex flex-col">
      {/* Minimal Navbar - Only shows logo and home link */}
      <Navbar variant="minimal" />

      {/* Main Content */}
      <main className="pt-14 md:pt-16 flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-dark-card border-t border-neutral-200 dark:border-neutral-700 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                2025 ImmoGuinee. Tous droits reserves.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link
                href="/legal/conditions-utilisation"
                className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
              >
                Conditions d&apos;utilisation
              </Link>
              <Link
                href="/legal/politique-confidentialite"
                className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
              >
                Confidentialite
              </Link>
              <Link
                href="/legal"
                className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
              >
                Informations legales
              </Link>
              <a
                href="mailto:support@immoguinee.com"
                className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
