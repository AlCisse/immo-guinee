'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DeconnexionPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear all auth data from localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');

    // Clear any other potential auth data
    localStorage.removeItem('immog_token');
    localStorage.removeItem('immog_user');
    localStorage.removeItem('immog_refresh_token');

    // Clear session storage too
    sessionStorage.clear();

    // Redirect to home after a short delay
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Déconnexion en cours...
        </h1>
        <p className="text-neutral-500">
          Vous allez être redirigé vers la page d'accueil
        </p>
      </div>
    </div>
  );
}
