'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface SegmentErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  // Libellés i18n-friendly : centralisés ici pour que chaque segment puisse
  // passer FR/EN sans câbler toute la chaîne i18n (le error.tsx racine hard-code
  // encore le FR — i18n complet reporté au lot BASSES #28).
  title?: string;
  message?: string;
  retryLabel?: string;
  homeLabel?: string;
}

/**
 * R12 — Boundary d'erreur de segment.
 *
 * Contrairement au `error.tsx` racine (plein écran, qui masque toute la page),
 * ce composant s'affiche *à la place des enfants fautifs* tout en préservant
 * le layout du segment (sidebar / navigation). Une page qui crash ne détruit
 * plus la nav : l'utilisateur peut naviguer ailleurs sans recharger.
 *
 * Les `error.tsx` de segment ((auth)/dashboard, (admin)/admin, (moderator),
 * (client), (auth)) délèguent simplement à ce composant.
 */
export default function SegmentError({
  error,
  reset,
  title = 'Une erreur est survenue',
  message = "Nous n'avons pas pu charger cette section. Veuillez réessayer.",
  retryLabel = 'Réessayer',
  homeLabel = "Retour à l'accueil",
}: SegmentErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
        {title}
      </h2>
      <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto mb-8">
        {message}
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
        >
          {retryLabel}
        </button>
        <Link
          href="/"
          className="px-6 py-3 border border-primary-500 text-primary-500 font-semibold rounded-xl hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
        >
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}