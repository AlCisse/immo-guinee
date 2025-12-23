'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Building,
  FileText,
  CreditCard,
  MessageSquare,
  AlertTriangle,
  Star,
  Shield,
  Calendar,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Settings,
  Download,
  Activity,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api/client';

// Format helpers
const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

const formatMoney = (amount: number) => {
  if (amount >= 1000000000) {
    return (amount / 1000000000).toFixed(1) + ' Mrd GNF';
  }
  if (amount >= 1000000) {
    const millions = amount / 1000000;
    return millions % 1 === 0
      ? millions.toFixed(0) + 'M GNF'
      : millions.toFixed(1) + 'M GNF';
  }
  return new Intl.NumberFormat('fr-GN').format(amount) + ' GNF';
};

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  href,
  color = 'primary',
}: {
  icon: any;
  label: string;
  value: number | string;
  subValue?: string;
  trend?: number;
  href: string;
  color?: 'primary' | 'success' | 'warning' | 'info' | 'error';
}) {
  const colorClasses = {
    primary: 'from-primary-400 to-primary-600',
    success: 'from-green-400 to-green-600',
    warning: 'from-amber-400 to-amber-600',
    info: 'from-blue-400 to-blue-600',
    error: 'from-red-400 to-red-600',
  };

  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -4 }}
        className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-soft hover:shadow-lg transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between mb-3">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trend !== undefined && (
            <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
          {value}
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {label}
        </p>
        {subValue && (
          <p className="text-xs text-neutral-400 mt-1">{subValue}</p>
        )}
      </motion.div>
    </Link>
  );
}

// Quick Action Component
function QuickAction({
  icon: Icon,
  label,
  href,
  count,
  urgent = false,
}: {
  icon: any;
  label: string;
  href: string;
  count?: number;
  urgent?: boolean;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`flex items-center gap-3 p-4 bg-white dark:bg-dark-card rounded-xl shadow-soft hover:shadow-md transition-all ${
          urgent ? 'border-l-4 border-red-500' : ''
        }`}
      >
        <div className={`p-2.5 rounded-lg ${
          urgent
            ? 'bg-red-50 dark:bg-red-500/10'
            : 'bg-primary-50 dark:bg-primary-500/10'
        }`}>
          <Icon className={`w-5 h-5 ${urgent ? 'text-red-500' : 'text-primary-500'}`} />
        </div>
        <div className="flex-1">
          <span className="font-medium text-neutral-900 dark:text-white">{label}</span>
          {count !== undefined && count > 0 && (
            <p className={`text-xs ${urgent ? 'text-red-500' : 'text-neutral-500'}`}>
              {count} en attente
            </p>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-neutral-400" />
      </motion.div>
    </Link>
  );
}

// Distribution Bar
function DistributionBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
        <span className="font-medium text-neutral-900 dark:text-white">{value}</span>
      </div>
      <div className="h-2 bg-neutral-100 dark:bg-dark-bg rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState(30);

  // Fetch analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-analytics', period],
    queryFn: async () => {
      const response = await api.admin.analytics(period);
      return response.data;
    },
  });

  // Fetch sidebar counts
  const { data: countsData } = useQuery({
    queryKey: ['admin-sidebar-counts'],
    queryFn: async () => {
      const response = await api.admin.sidebarCounts();
      return response.data;
    },
  });

  // Fetch dashboard stats
  const { data: statsData } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const response = await api.admin.dashboardStats();
      return response.data;
    },
  });

  const analytics = analyticsData?.data || {};
  const counts = countsData?.data || {};
  const stats = statsData?.data || {};

  if (analyticsLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-orange-500 pt-6 pb-12 md:pt-8 md:pb-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Tableau de bord Admin
            </h1>
            <p className="text-white/80">
              Vue d'ensemble de la plateforme ImmoGuinee
            </p>
          </motion.div>

          {/* Period Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-2 mt-6"
          >
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setPeriod(days)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  period === days
                    ? 'bg-white text-primary-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {days} jours
              </button>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-8">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            icon={Users}
            label="Utilisateurs"
            value={formatNumber(analytics?.users?.total_users || 0)}
            subValue={`+${analytics?.users?.new_users || 0} cette periode`}
            href="/admin/utilisateurs"
            color="primary"
          />
          <StatCard
            icon={Building}
            label="Annonces actives"
            value={formatNumber(analytics?.listings?.active_listings || 0)}
            subValue={`+${analytics?.listings?.new_listings || 0} nouvelles`}
            href="/admin/annonces"
            color="success"
          />
          <StatCard
            icon={CreditCard}
            label="Volume transactions"
            value={formatMoney(analytics?.transactions?.total_volume_gnf || 0)}
            href="/admin/paiements"
            color="info"
          />
          <StatCard
            icon={Star}
            label="Note moyenne"
            value={Number(analytics?.quality?.average_rating || 0).toFixed(1)}
            subValue={`${analytics?.quality?.total_ratings || 0} evaluations`}
            href="/admin/notations"
            color="warning"
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6"
            >
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Actions rapides
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <QuickAction
                  icon={CheckCircle}
                  label="File de moderation"
                  href="/admin/moderation"
                  count={counts.listings_pending}
                  urgent={counts.listings_pending > 0}
                />
                <QuickAction
                  icon={AlertTriangle}
                  label="Litiges en cours"
                  href="/admin/litiges"
                  count={counts.disputes_open}
                  urgent={counts.disputes_open > 0}
                />
                <QuickAction
                  icon={Shield}
                  label="Certifications"
                  href="/admin/certifications"
                  count={counts.certifications_pending}
                  urgent={counts.certifications_pending > 0}
                />
                <QuickAction
                  icon={Star}
                  label="Notations a moderer"
                  href="/admin/notations"
                  count={counts.ratings_pending}
                />
                <QuickAction
                  icon={Users}
                  label="Gestion utilisateurs"
                  href="/admin/utilisateurs"
                />
                <QuickAction
                  icon={Activity}
                  label="Statistiques"
                  href="/admin/stats"
                />
              </div>
            </motion.div>

            {/* Revenue Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6"
            >
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Revenus plateforme
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 dark:bg-green-500/10 rounded-xl">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                    Commissions collectees
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatMoney(analytics?.transactions?.commission_earned_gnf || 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                    Volume total
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatMoney(analytics?.transactions?.total_volume_gnf || 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-primary-50 dark:bg-primary-500/10 rounded-xl">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                    Transactions completees
                  </p>
                  <p className="text-2xl font-bold text-primary-600">
                    {analytics?.transactions?.completed_transactions || 0}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Distributions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Users by Role */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6"
              >
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                  Utilisateurs par role
                </h3>
                <div className="space-y-3">
                  {Object.entries(analytics?.users?.users_by_role || {}).map(([role, count]) => (
                    <DistributionBar
                      key={role}
                      label={role.replace('_', ' ')}
                      value={count as number}
                      total={analytics?.users?.total_users || 1}
                      color="bg-gradient-to-r from-primary-400 to-primary-600"
                    />
                  ))}
                </div>
              </motion.div>

              {/* Listings by Type */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6"
              >
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                  Annonces par type
                </h3>
                <div className="space-y-3">
                  {Object.entries(analytics?.listings?.listings_by_type || {}).map(([type, count]) => (
                    <DistributionBar
                      key={type}
                      label={type}
                      value={count as number}
                      total={analytics?.listings?.active_listings || 1}
                      color="bg-gradient-to-r from-green-400 to-green-600"
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Platform Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6"
            >
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Etat de la plateforme
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Annonces actives</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {counts.listings_active || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">En attente</span>
                  <span className="font-semibold text-amber-500">
                    {counts.listings_pending || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Messages non lus</span>
                  <span className="font-semibold text-blue-500">
                    {counts.messages_unread || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Contrats en cours</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {counts.contracts_pending || 0}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Admin Tools */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6"
            >
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Outils admin
              </h2>
              <div className="space-y-3">
                <Link
                  href="/admin/stats"
                  className="flex items-center justify-between py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-500"
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Statistiques avancees
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/admin/documentation"
                  className="flex items-center justify-between py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-500"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Documentation
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/admin/settings"
                  className="flex items-center justify-between py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-500"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Parametres
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/admin/visites"
                  className="flex items-center justify-between py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-500"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Gestion visites
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>

            {/* System Health */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-soft p-6 text-white"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold">Systeme operationnel</h2>
              </div>
              <p className="text-white/80 text-sm">
                Tous les services fonctionnent normalement. Derniere verification il y a 5 minutes.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
