'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';

export default function DeconnexionPage() {
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Call logout API - server will clear the httpOnly cookie
        await api.auth.logout();
      } catch (error) {
        // Ignore errors - we'll clear local data anyway
        console.error('Logout API error:', error);
      }

      // Clear local user cache (not sensitive - token is in httpOnly cookie)
      localStorage.removeItem('user');
      localStorage.removeItem('redirect_data');

      // Clear any legacy auth data (backward compatibility)
      localStorage.removeItem('immog_user');

      // Clear session storage
      sessionStorage.clear();

      // Redirect to home after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    };

    performLogout();
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
