'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary-500 mb-4">Oops!</h1>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto mb-8">
          Nous nous excusons pour ce desagrement. Veuillez reessayer.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
          >
            Reessayer
          </button>
          <Link
            href="/"
            className="px-6 py-3 border border-primary-500 text-primary-500 font-semibold rounded-xl hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
          >
            Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
