'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  Eye,
  Heart,
  Calendar,
  FileText,
  CreditCard,
  MessageSquare,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Loader2,
  Building,
  Users,
  Wallet,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useTranslations } from '@/lib/i18n';
import { FacebookSettings } from '@/components/facebook';

// Types
interface DashboardStats {
  listings: {
    total: number;
    active: number;
    pending: number;
    expired: number;
  };
  views: {
    total: number;
    thisMonth: number;
    trend: number;
  };
  favorites: {
    total: number;
    received: number;
  };
  visits: {
    upcoming: number;
    completed: number;
    pending: number;
  };
  contracts: {
    total: number;
    active: number;
    pending: number;
  };
  messages: {
    unread: number;
    total: number;
  };
}

interface RecentListing {
  id: string;
  titre: string;
  prix?: number | string;
  loyer_mensuel?: number | string;
  quartier: string;
  commune: string;
  statut: string;
  vues?: number;
  vues_count?: number;
  photo_principale: string | null;
  created_at: string;
}

interface UpcomingVisit {
  id: string;
  listing: {
    id: string;
    titre: string;
  };
  client_nom: string;
  date_visite: string;
  heure_visite: string;
  statut: string;
}

// Format price - handles string, number, null, undefined
const formatPrice = (price: number | string | null | undefined, priceNotDefined: string) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : (price || 0);

  if (isNaN(numPrice) || numPrice === 0) {
    return priceNotDefined;
  }

  if (numPrice >= 1000000000) {
    return (numPrice / 1000000000).toFixed(1) + ' Mrd GNF';
  }
  if (numPrice >= 1000000) {
    const millions = numPrice / 1000000;
    return millions % 1 === 0
      ? millions.toFixed(0) + 'M GNF'
      : millions.toFixed(1) + 'M GNF';
  }
  return new Intl.NumberFormat('fr-GN').format(numPrice) + ' GNF';
};

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
};

// Status badge component
function StatusBadge({ status, labels }: { status: string; labels: Record<string, string> }) {
  const config: Record<string, { labelKey: string; className: string; icon: any }> = {
    ACTIVE: {
      labelKey: 'active',
      className: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
      icon: CheckCircle,
    },
    EN_ATTENTE: {
      labelKey: 'pending',
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
      icon: Clock,
    },
    PENDING: {
      labelKey: 'pending',
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
      icon: Clock,
    },
    CONFIRMED: {
      labelKey: 'confirmed',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
      icon: CheckCircle,
    },
    COMPLETED: {
      labelKey: 'completed',
      className: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
      icon: CheckCircle,
    },
    CANCELLED: {
      labelKey: 'cancelled',
      className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
      icon: XCircle,
    },
    EXPIREE: {
      labelKey: 'expired',
      className: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-500/10 dark:text-neutral-400',
      icon: AlertCircle,
    },
  };

  const statusConfig = config[status] || config.EN_ATTENTE;
  const Icon = statusConfig.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.className}`}>
      <Icon className="w-3 h-3" />
      {labels[statusConfig.labelKey] || statusConfig.labelKey}
    </span>
  );
}

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
  color?: 'primary' | 'success' | 'warning' | 'info';
}) {
  const colorClasses = {
    primary: 'from-primary-400 to-primary-600',
    success: 'from-green-400 to-green-600',
    warning: 'from-amber-400 to-amber-600',
    info: 'from-blue-400 to-blue-600',
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
  color = 'primary',
}: {
  icon: any;
  label: string;
  href: string;
  color?: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-3 p-4 bg-white dark:bg-dark-card rounded-xl shadow-soft hover:shadow-md transition-all"
      >
        <div className={`p-2.5 rounded-lg bg-${color}-50 dark:bg-${color}-500/10`}>
          <Icon className={`w-5 h-5 text-${color}-500`} />
        </div>
        <span className="font-medium text-neutral-900 dark:text-white">{label}</span>
        <ArrowRight className="w-4 h-4 text-neutral-400 ml-auto" />
      </motion.div>
    </Link>
  );
}

export default function DashboardContent() {
  const { t } = useTranslations();

  // Status labels for StatusBadge
  const statusLabels = {
    active: t('dashboard.myListings.status.active'),
    pending: t('dashboard.myListings.status.pending'),
    confirmed: t('dashboard.visits.status.confirmed'),
    completed: t('dashboard.visits.status.completed'),
    cancelled: t('dashboard.visits.status.cancelled'),
    expired: t('dashboard.myListings.status.expired'),
  };

  // Fetch user data
  const { data: userData } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await api.auth.me();
      return response.data;
    },
  });

  // Fetch user's listings
  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['my-listings'],
    queryFn: async () => {
      const response = await api.listings.my({ per_page: 5 });
      return response.data;
    },
  });

  // Fetch favorites count
  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const response = await api.favorites.list();
      return response.data;
    },
  });

  // Fetch upcoming visits
  const { data: visitsData, isLoading: visitsLoading } = useQuery({
    queryKey: ['visits-upcoming'],
    queryFn: async () => {
      const response = await api.visits.upcoming();
      return response.data;
    },
  });

  // Fetch visit stats
  const { data: visitStatsData } = useQuery({
    queryKey: ['visits-stats'],
    queryFn: async () => {
      const response = await api.visits.stats();
      return response.data;
    },
  });

  // Fetch contracts
  const { data: contractsData } = useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const response = await api.contracts.list({ per_page: 5 });
      return response.data;
    },
  });

  const user = userData?.data?.user || userData?.user;

  // Handle different API response structures - could be array or paginated object
  // API returns: { success: true, data: { listings: [...], pagination: {...} } }
  const rawListings = listingsData?.data;
  const listings = Array.isArray(rawListings)
    ? rawListings
    : (Array.isArray(rawListings?.listings) ? rawListings.listings : (Array.isArray(rawListings?.data) ? rawListings.data : []));

  const rawFavorites = favoritesData?.data?.favorites || favoritesData?.data;
  const favorites = Array.isArray(rawFavorites) ? rawFavorites : [];

  const rawVisits = visitsData?.data;
  const upcomingVisits = Array.isArray(rawVisits)
    ? rawVisits
    : (Array.isArray(rawVisits?.data) ? rawVisits.data : []);

  const visitStats = visitStatsData?.data || { pending: 0, confirmed: 0, completed: 0 };

  const rawContracts = contractsData?.data;
  const contracts = Array.isArray(rawContracts)
    ? rawContracts
    : (Array.isArray(rawContracts?.data) ? rawContracts.data : []);

  // Calculate stats from real data
  const stats = {
    totalListings: listings.length,
    activeListings: listings.filter((l: any) => l.statut === 'ACTIVE').length,
    pendingListings: listings.filter((l: any) => l.statut === 'EN_ATTENTE' || l.statut === 'PENDING').length,
    totalFavorites: favorites.length,
    upcomingVisits: upcomingVisits.length,
    pendingVisits: visitStats.pending || 0,
    completedVisits: visitStats.completed || 0,
    totalContracts: contracts.length,
  };

  const isLoading = listingsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-orange-500 pt-6 pb-12 md:pt-8 md:pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {t('dashboard.greeting', { name: user?.nom_complet?.split(' ')[0] || t('profile.defaultUser') })}
            </h1>
            <p className="text-white/80">
              {t('dashboard.welcomeSubtitle')}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 -mt-8">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            icon={Building}
            label={t('dashboard.stats.myListings')}
            value={stats.totalListings}
            subValue={t('dashboard.stats.activeCount', { count: stats.activeListings })}
            href="/mes-annonces"
            color="primary"
          />
          <StatCard
            icon={Heart}
            label={t('dashboard.stats.favorites')}
            value={stats.totalFavorites}
            href="/favoris"
            color="warning"
          />
          <StatCard
            icon={Calendar}
            label={t('dashboard.stats.visits')}
            value={stats.upcomingVisits}
            subValue={t('dashboard.stats.completedCount', { count: stats.completedVisits })}
            href="/visites"
            color="info"
          />
          <StatCard
            icon={FileText}
            label={t('dashboard.stats.contracts')}
            value={stats.totalContracts}
            href="/dashboard/mes-contrats"
            color="success"
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Listings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-soft"
            >
              <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-dark-border">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {t('dashboard.recentListings')}
                </h2>
                <Link
                  href="/mes-annonces"
                  className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
                >
                  {t('common.viewAll')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {listings.length > 0 ? (
                <div className="divide-y divide-neutral-100 dark:divide-dark-border">
                  {listings.slice(0, 5).map((listing: any) => (
                    <Link
                      key={listing.id}
                      href={`/bien/${listing.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-100 dark:bg-dark-bg flex-shrink-0">
                        {listing.photo_principale ? (
                          <img
                            src={listing.photo_principale}
                            alt={listing.titre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-6 h-6 text-neutral-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-neutral-900 dark:text-white truncate">
                          {listing.titre}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-neutral-500">
                          <MapPin className="w-3.5 h-3.5" />
                          {listing.quartier}, {listing.commune}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-primary-500 font-semibold text-sm">
                            {formatPrice(listing.loyer_mensuel || listing.prix, t('dashboard.priceNotDefined'))}
                          </span>
                          <StatusBadge status={listing.statut} labels={statusLabels} />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-neutral-500 text-sm">
                          <Eye className="w-4 h-4" />
                          {listing.vues_count || listing.vues || 0}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Home className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                    {t('dashboard.myListings.noListings')}
                  </p>
                  <Link href="/publier">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-6 py-2.5 bg-primary-500 text-white font-medium rounded-xl"
                    >
                      {t('dashboard.myListings.publishListing')}
                    </motion.button>
                  </Link>
                </div>
              )}
            </motion.div>

            {/* Upcoming Visits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-soft"
            >
              <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-dark-border">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {t('dashboard.upcomingVisits')}
                </h2>
                <Link
                  href="/visites"
                  className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
                >
                  {t('dashboard.calendar')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {upcomingVisits.length > 0 ? (
                <div className="divide-y divide-neutral-100 dark:divide-dark-border">
                  {upcomingVisits.slice(0, 4).map((visit: any) => (
                    <div
                      key={visit.id}
                      className="flex items-center gap-4 p-4"
                    >
                      <div className="text-center flex-shrink-0 w-14">
                        <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                          {new Date(visit.date_visite).getDate()}
                        </p>
                        <p className="text-xs text-neutral-500 uppercase">
                          {new Date(visit.date_visite).toLocaleDateString('fr-FR', { month: 'short' })}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-neutral-900 dark:text-white truncate">
                          {visit.listing?.titre || t('dashboard.defaultProperty')}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {visit.heure_visite?.slice(0, 5)}
                          </span>
                          <span>{visit.client_nom}</span>
                        </div>
                      </div>
                      <StatusBadge status={visit.statut} labels={statusLabels} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-500 dark:text-neutral-400">
                    {t('dashboard.noScheduledVisits')}
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-5"
            >
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                {t('dashboard.quickActions.title')}
              </h2>
              <div className="space-y-3">
                <Link href="/publier">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-500 to-orange-500 text-white font-semibold rounded-xl"
                  >
                    <Plus className="w-5 h-5" />
                    {t('dashboard.quickActions.publishListing')}
                  </motion.button>
                </Link>

                <QuickAction
                  icon={Calendar}
                  label={t('dashboard.quickActions.scheduleVisit')}
                  href="/visites"
                  color="primary"
                />
                <QuickAction
                  icon={FileText}
                  label={t('dashboard.quickActions.generateContract')}
                  href="/contrats/generer"
                  color="primary"
                />
                <QuickAction
                  icon={MessageSquare}
                  label={t('dashboard.quickActions.messages')}
                  href="/messagerie"
                  color="primary"
                />
              </div>
            </motion.div>

            {/* Account Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-5"
            >
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                {t('dashboard.account.title')}
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-lg font-semibold">
                    {user?.nom_complet?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {user?.nom_complet || t('profile.defaultUser')}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {t(`dashboard.accountTypes.${user?.type_compte || 'PARTICULIER'}`)}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 dark:border-dark-border space-y-2">
                  <Link
                    href="/profil"
                    className="flex items-center justify-between py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-500"
                  >
                    <span>{t('dashboard.account.myProfile')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/parametres"
                    className="flex items-center justify-between py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-500"
                  >
                    <span>{t('dashboard.account.settings')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/dashboard/certification"
                    className="flex items-center justify-between py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-500"
                  >
                    <span>{t('dashboard.account.certification')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Facebook Integration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <FacebookSettings />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
