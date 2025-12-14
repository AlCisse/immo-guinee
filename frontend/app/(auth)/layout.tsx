'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Loader2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login with return URL
      const currentPath = window.location.pathname;
      router.push(`/auth/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto" />
          </div>
          <p className="mt-4 text-neutral-500">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto" />
          </div>
          <p className="mt-4 text-neutral-500">Redirection vers la connexion...</p>
        </div>
      </div>
    );
  }

  // User is authenticated, show the protected content with Navbar
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      {/* Navbar with bottom tabbar for mobile */}
      <Navbar variant="full" />

      {/* Main Content - pt-14 for mobile header, pb-20 for bottom tabbar */}
      <main className="pt-14 md:pt-16 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
