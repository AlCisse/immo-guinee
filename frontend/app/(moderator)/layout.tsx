'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  FileCheck,
  AlertTriangle,
  Users,
  History,
  LogOut,
  Shield,
} from 'lucide-react';
import { useModeratorDashboard } from '@/lib/hooks/useModerator';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export default function ModeratorLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { data: dashboardData } = useModeratorDashboard();

  // Check authentication and role
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    } else if (!isLoading && user && !user.roles?.some((r: string) => ['admin', 'moderator'].includes(r))) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems: NavItem[] = [
    {
      href: '/moderator',
      label: 'Accueil',
      icon: LayoutDashboard,
    },
    {
      href: '/moderator/annonces',
      label: 'Annonces',
      icon: FileCheck,
      badge: dashboardData?.pending_count,
    },
    {
      href: '/moderator/signalements',
      label: 'Signalements',
      icon: AlertTriangle,
      badge: dashboardData?.reported_count,
    },
    {
      href: '/moderator/utilisateurs',
      label: 'Utilisateurs',
      icon: Users,
      badge: dashboardData?.flagged_users_count,
    },
    {
      href: '/moderator/historique',
      label: 'Historique',
      icon: History,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/moderator') {
      return pathname === '/moderator';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg pb-20 md:pb-0 md:pl-64">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 flex-col bg-white dark:bg-dark-card border-r border-neutral-200 dark:border-dark-border">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-neutral-200 dark:border-dark-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-neutral-900 dark:text-white">Moderation</h1>
            <p className="text-xs text-neutral-500">ImmoGuinee</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all',
                isActive(item.href)
                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-dark-hover'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-error-100 dark:bg-error-500/20 text-error-600 dark:text-error-400 rounded-full">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-neutral-200 dark:border-dark-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-500/20 dark:to-primary-500/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                {user.nom_complet?.charAt(0)?.toUpperCase() || 'M'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                {user.nom_complet}
              </p>
              <p className="text-xs text-neutral-500 truncate">Modérateur</p>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 text-neutral-400 hover:text-error-500 transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-dark-card border-b border-neutral-200 dark:border-dark-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-neutral-900 dark:text-white text-sm">Moderation</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-500/20 dark:to-primary-500/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                {user.nom_complet?.charAt(0)?.toUpperCase() || 'M'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-dark-card border-t border-neutral-200 dark:border-dark-border safe-area-inset-bottom">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center gap-1 px-3 py-2 min-w-[64px] rounded-xl transition-colors',
                isActive(item.href)
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-neutral-500 dark:text-neutral-400'
              )}
            >
              <div className="relative">
                <item.icon className="w-6 h-6" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold bg-error-500 text-white rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16 md:pt-0 px-4 md:px-6 lg:px-8 py-6 min-h-screen">
        {children}
      </main>
    </div>
  );
}
