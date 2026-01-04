'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from '@/lib/i18n';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary-500 mb-4">{t('page.oops')}</h1>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
          {t('page.title')}
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto mb-8">
          {t('page.subtitle')}
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
          >
            {t('page.retry')}
          </button>
          <Link
            href="/"
            className="px-6 py-3 border border-primary-500 text-primary-500 font-semibold rounded-xl hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
          >
            {t('page.backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
