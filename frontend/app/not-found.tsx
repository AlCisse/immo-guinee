'use client';

import Link from 'next/link';
import { useTranslations } from '@/lib/i18n';

export default function NotFound() {
  const t = useTranslations('errors');

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary-500">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-neutral-900 dark:text-white">
          {t('404.title')}
        </h2>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
          {t('404.subtitle')}
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
          >
            {t('404.backHome')}
          </Link>
          <Link
            href="/recherche"
            className="px-6 py-3 border border-primary-500 text-primary-500 font-semibold rounded-xl hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
          >
            {t('404.searchListing')}
          </Link>
        </div>
      </div>
    </div>
  );
}
