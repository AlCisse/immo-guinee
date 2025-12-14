'use client';

import Link from 'next/link';
import { clsx } from 'clsx';
import {
  FileCheck,
  AlertTriangle,
  Users,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useModeratorDashboard } from '@/lib/hooks/useModerator';

export default function ModeratorDashboard() {
  const { data, isLoading } = useModeratorDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  const stats = data;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Welcome Section */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Dashboard Moderation
        </h1>
        <p className="text-neutral-500 mt-1">
          {stats?.today_actions || 0} actions aujourd&apos;hui
        </p>
      </div>

      {/* Quick Stats Grid - Mobile optimized */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/moderator/annonces">
          <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-soft border-l-4 border-primary-500 active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between">
              <FileCheck className="w-8 h-8 text-primary-500" />
              <span className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats?.pending_count || 0}
              </span>
            </div>
            <p className="text-sm text-neutral-500 mt-2">En attente</p>
          </div>
        </Link>

        <Link href="/moderator/signalements">
          <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-soft border-l-4 border-error-500 active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between">
              <AlertTriangle className="w-8 h-8 text-error-500" />
              <span className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats?.reported_count || 0}
              </span>
            </div>
            <p className="text-sm text-neutral-500 mt-2">Signalements</p>
          </div>
        </Link>

        <Link href="/moderator/utilisateurs?flagged=true">
          <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-soft border-l-4 border-warning-500 active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between">
              <Users className="w-8 h-8 text-warning-500" />
              <span className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats?.flagged_users_count || 0}
              </span>
            </div>
            <p className="text-sm text-neutral-500 mt-2">Utilisateurs flaggés</p>
          </div>
        </Link>

        <Link href="/moderator/historique?my_actions=true">
          <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-soft border-l-4 border-success-500 active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between">
              <Clock className="w-8 h-8 text-success-500" />
              <span className="text-2xl font-bold text-neutral-900 dark:text-white">
                {stats?.today_actions || 0}
              </span>
            </div>
            <p className="text-sm text-neutral-500 mt-2">Mes actions</p>
          </div>
        </Link>
      </div>

      {/* My Performance Stats */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          <h2 className="font-semibold text-neutral-900 dark:text-white">Mes statistiques</h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-success-600 dark:text-success-400">
              {stats?.my_stats?.approvals || 0}
            </div>
            <div className="flex items-center justify-center gap-1 text-xs text-neutral-500 mt-1">
              <CheckCircle className="w-3 h-3" />
              <span>Approuvées</span>
            </div>
          </div>

          <div className="text-center border-x border-neutral-200 dark:border-dark-border">
            <div className="text-2xl font-bold text-error-600 dark:text-error-400">
              {stats?.my_stats?.rejections || 0}
            </div>
            <div className="flex items-center justify-center gap-1 text-xs text-neutral-500 mt-1">
              <XCircle className="w-3 h-3" />
              <span>Rejetées</span>
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">
              {stats?.my_stats?.this_week || 0}
            </div>
            <div className="flex items-center justify-center gap-1 text-xs text-neutral-500 mt-1">
              <Clock className="w-3 h-3" />
              <span>Cette semaine</span>
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Items */}
      {stats?.urgent_items && stats.urgent_items.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-neutral-200 dark:border-dark-border bg-error-50 dark:bg-error-500/10">
            <Zap className="w-5 h-5 text-error-500" />
            <h2 className="font-semibold text-error-700 dark:text-error-400">Urgent</h2>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-dark-border">
            {stats.urgent_items.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.type === 'listing' ? `/moderator/annonces?id=${item.id}` : `/moderator/signalements`}
                className="flex items-center gap-3 p-4 hover:bg-neutral-50 dark:hover:bg-dark-hover active:bg-neutral-100 dark:active:bg-dark-hover transition-colors"
              >
                <div className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  item.type === 'listing'
                    ? 'bg-primary-100 dark:bg-primary-500/20'
                    : 'bg-error-100 dark:bg-error-500/20'
                )}>
                  {item.type === 'listing' ? (
                    <FileCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-error-600 dark:text-error-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {item.type === 'listing' ? 'Annonce' : 'Signalement'} - {item.status}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/moderator/annonces">
          <button className="w-full bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-semibold py-4 px-4 rounded-2xl transition-colors flex items-center justify-center gap-2">
            <FileCheck className="w-5 h-5" />
            <span>Valider annonces</span>
          </button>
        </Link>

        <Link href="/moderator/signalements">
          <button className="w-full bg-error-500 hover:bg-error-600 active:bg-error-700 text-white font-semibold py-4 px-4 rounded-2xl transition-colors flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Signalements</span>
          </button>
        </Link>
      </div>
    </div>
  );
}
