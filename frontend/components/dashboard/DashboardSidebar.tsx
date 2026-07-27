'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from '@/lib/i18n';
import {
  LayoutDashboard,
  Building2,
  FileText,
  CreditCard,
  Calendar,
  MessageSquare,
  Heart,
  ShieldCheck,
  AlertTriangle,
  User,
  Settings,
} from 'lucide-react';

const items = [
  { href: '/dashboard', key: 'dashboard', Icon: LayoutDashboard, exact: true },
  { href: '/mes-annonces', key: 'listings', Icon: Building2 },
  { href: '/dashboard/mes-contrats', key: 'contracts', Icon: FileText },
  { href: '/dashboard/mes-paiements', key: 'payments', Icon: CreditCard },
  { href: '/visites', key: 'visits', Icon: Calendar },
  { href: '/dashboard/messagerie', key: 'messages', Icon: MessageSquare },
  { href: '/favoris', key: 'favorites', Icon: Heart },
  { href: '/dashboard/certification', key: 'certification', Icon: ShieldCheck },
  { href: '/dashboard/mes-litiges', key: 'disputes', Icon: AlertTriangle },
  { href: '/profil', key: 'profile', Icon: User },
  { href: '/parametres', key: 'settings', Icon: Settings },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { t } = useTranslations();

  return (
    <aside className="hidden lg:block w-60 shrink-0 border-r border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card">
      <nav className="sticky top-20 p-3 space-y-1">
        {items.map(({ href, key, Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-dark-hover hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${active ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400'}`} />
              {t(`dashboard.nav.${key}`)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
