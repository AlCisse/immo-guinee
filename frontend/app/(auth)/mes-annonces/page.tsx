'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useTranslations } from '@/lib/i18n';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  Home,
  ArrowLeft,
  Loader2,
  AlertCircle,
  X,
  Building2,
  Users,
} from 'lucide-react';

// Statut d'annonce
type AnnonceStatus = 'ACTIVE' | 'EN_ATTENTE' | 'PENDING' | 'EXPIREE' | 'REJETEE' | 'REJECTED' | 'BROUILLON' | 'publiee' | 'ARCHIVEE' | 'SUSPENDUE';

interface Annonce {
  id: string;
  titre: string;
  prix?: number | string;
  loyer_mensuel?: number | string;
  quartier: string;
  commune: string;
  type_bien: string;
  type_transaction?: 'LOCATION' | 'LOCATION_COURTE' | 'VENTE' | 'location' | 'location_courte' | 'vente';
  duree_minimum_jours?: number;
  photo_principale: string | null;
  statut: AnnonceStatus;
  vues?: number;
  vues_count?: number;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { icon: any; className: string }> = {
  ACTIVE: {
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  },
  publiee: {
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  },
  EN_ATTENTE: {
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
  },
  PENDING: {
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
  },
  BROUILLON: {
    icon: Clock,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  },
  EXPIREE: {
    icon: AlertCircle,
    className: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-500/10 dark:text-neutral-400',
  },
  ARCHIVEE: {
    icon: CheckCircle,
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  },
  REJETEE: {
    icon: XCircle,
    className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  },
  REJECTED: {
    icon: XCircle,
    className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  },
};

function formatPrice(price: number | string | null | undefined, priceNotDefined: string): string {
  // Convert string to number and handle invalid values
  const numPrice = typeof price === 'string' ? parseFloat(price) : (price || 0);

  if (isNaN(numPrice) || numPrice === 0) {
    return priceNotDefined;
  }

  if (numPrice >= 1000000000) {
    return (numPrice / 1000000000).toFixed(1) + ' Mrd GNF';
  }
  if (numPrice >= 1000000) {
    const millions = numPrice / 1000000;
    // Use 1 decimal place if not a whole number, otherwise no decimals
    return millions % 1 === 0
      ? millions.toFixed(0) + 'M GNF'
      : millions.toFixed(1) + 'M GNF';
  }
  return new Intl.NumberFormat('fr-GN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(numPrice) + ' GNF';
}

export default function MesAnnoncesPage() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const successParam = searchParams.get('success');
  const showSuccess = successParam === 'true' || successParam === 'created';
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<AnnonceStatus | 'ALL'>('ALL');
  const [showSuccessMessage, setShowSuccessMessage] = useState(showSuccess);

  // Get status label from translations
  const getStatusLabel = (status: string) => t(`myListings.status.${status}`) || status;

  // Show toast notification for created listing
  useEffect(() => {
    if (successParam === 'created') {
      toast.success(t('myListings.publishSuccess'));
      // Clean up URL without refresh
      window.history.replaceState({}, '', '/mes-annonces');
    }
  }, [successParam, t]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showRentedModal, setShowRentedModal] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  // Fetch user's listings from API
  const { data: listingsData, isLoading, error } = useQuery({
    queryKey: ['my-listings'],
    queryFn: async () => {
      const response = await api.listings.my();
      return response.data;
    },
  });

  const annonces: Annonce[] = listingsData?.data?.listings || [];

  // Delete listing mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.listings.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      toast.success(t('myListings.deleteSuccess'));
      setActiveMenu(null);
    },
    onError: () => {
      toast.error(t('myListings.deleteError'));
    },
  });

  // Mark as rented mutation
  const markAsRentedMutation = useMutation({
    mutationFn: ({ id, rentedViaImmoguinee }: { id: string; rentedViaImmoguinee: boolean }) =>
      api.listings.markAsRented(id, rentedViaImmoguinee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      toast.success(t('myListings.markAsRentedSuccess'));
      setActiveMenu(null);
      setShowRentedModal(false);
      setSelectedListingId(null);
    },
    onError: () => {
      toast.error(t('myListings.markAsRentedError'));
    },
  });

  // Reactivate listing mutation
  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.listings.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      toast.success(t('myListings.reactivateSuccess'));
      setActiveMenu(null);
    },
    onError: () => {
      toast.error(t('myListings.reactivateError'));
    },
  });

  // Masquer le message de succes apres 5 secondes
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  // Filtrer les annonces
  const filteredAnnonces = annonces.filter((annonce) => {
    const matchesSearch = annonce.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      annonce.quartier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || annonce.statut === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculer les statistiques
  const stats = {
    total: annonces.length,
    active: annonces.filter((a) => a.statut === 'ACTIVE').length,
    totalVues: annonces.reduce((sum, a) => sum + (a.vues_count || a.vues || 0), 0),
  };

  // Supprimer une annonce
  const handleDelete = (id: string) => {
    if (confirm(t('myListings.deleteConfirm'))) {
      deleteMutation.mutate(id);
    }
  };

  // Ouvrir le modal pour marquer comme loue
  const handleMarkAsRented = (id: string) => {
    setSelectedListingId(id);
    setShowRentedModal(true);
    setActiveMenu(null);
  };

  // Confirmer le marquage comme loue
  const confirmMarkAsRented = (rentedViaImmoguinee: boolean) => {
    if (selectedListingId) {
      markAsRentedMutation.mutate({ id: selectedListingId, rentedViaImmoguinee });
    }
  };

  // Reactiver une annonce
  const handleReactivate = (id: string) => {
    if (confirm(t('myListings.reactivateConfirm'))) {
      reactivateMutation.mutate(id);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-red-500 mb-4">{t('myListings.error.loading')}</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['my-listings'] })}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg"
          >
            {t('myListings.error.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-500 to-orange-500 pt-6 pb-8 md:pt-8 md:pb-12">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-6"
          >
            <Link
              href="/dashboard"
              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {t('myListings.title')}
              </h1>
              <p className="text-white/80 text-sm md:text-base">
                {t('myListings.subtitle')}
              </p>
            </div>
            <Link href="/publier">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-primary-600 font-semibold rounded-xl shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">{t('myListings.newListing')}</span>
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-white/80">{t('myListings.stats.total')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.active}</p>
              <p className="text-xs text-white/80">{t('myListings.stats.active')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.totalVues}</p>
              <p className="text-xs text-white/80">{t('myListings.stats.totalViews')}</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 -mt-4">
        {/* Success Message */}
        <AnimatePresence>
          {showSuccessMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 p-4 bg-green-100 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-green-700 dark:text-green-400 font-medium">
                {t('myListings.publishSuccess')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-soft mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('myListings.search')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-bg focus:outline-none focus:border-primary-500 text-neutral-900 dark:text-white"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {(['ALL', 'ACTIVE', 'EN_ATTENTE', 'ARCHIVEE', 'EXPIREE', 'REJETEE'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                    filterStatus === status
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 dark:bg-dark-bg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-dark-border'
                  }`}
                >
                  {status === 'ALL' ? t('myListings.filters.all') : getStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Annonces List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : filteredAnnonces.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-dark-card rounded-2xl p-8 text-center shadow-soft"
          >
            <Home className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              {t('myListings.noListings')}
            </h3>
            <p className="text-neutral-500 mb-6">
              {searchQuery || filterStatus !== 'ALL'
                ? t('myListings.noListingsHint')
                : t('myListings.noListingsEmpty')}
            </p>
            <Link href="/publier">
              <button className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors">
                {t('myListings.publishListing')}
              </button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredAnnonces.map((annonce, index) => {
              const statusConfig = STATUS_CONFIG[annonce.statut] || STATUS_CONFIG.EN_ATTENTE;
              const StatusIcon = statusConfig.icon;

              return (
                <motion.div
                  key={annonce.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Image */}
                    <div className="relative w-full sm:w-48 h-40 sm:h-auto flex-shrink-0">
                      {annonce.photo_principale ? (
                        <img
                          src={annonce.photo_principale}
                          alt={annonce.titre}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-dark-border dark:to-dark-bg flex items-center justify-center">
                          <Home className="w-12 h-12 text-neutral-400" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {/* Status Badge + Quick Action */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {getStatusLabel(annonce.statut)}
                            </span>

                            {/* Quick Mark as Rented Button */}
                            {annonce.statut === 'ACTIVE' && (
                              <button
                                onClick={() => handleMarkAsRented(annonce.id)}
                                disabled={markAsRentedMutation.isPending}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 transition-colors disabled:opacity-50"
                              >
                                {markAsRentedMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-3 h-3" />
                                )}
                                {t('myListings.actions.markAsRented')}
                              </button>
                            )}

                            {/* Quick Reactivate Button */}
                            {(annonce.statut === 'ARCHIVEE' || annonce.statut === 'EXPIREE') && (
                              <button
                                onClick={() => handleReactivate(annonce.id)}
                                disabled={reactivateMutation.isPending}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                              >
                                {reactivateMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Clock className="w-3 h-3" />
                                )}
                                {t('myListings.actions.reactivate')}
                              </button>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="font-semibold text-neutral-900 dark:text-white line-clamp-2 mb-1">
                            {annonce.titre}
                          </h3>

                          {/* Location */}
                          <div className="flex items-center gap-1.5 text-sm text-neutral-500 mb-2">
                            <MapPin className="w-4 h-4" />
                            {annonce.quartier}, {annonce.commune}
                          </div>

                          {/* Price and Type */}
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-bold text-primary-500">
                              {formatPrice(annonce.loyer_mensuel || annonce.prix || 0, t('myListings.priceNotDefined'))}
                              {(annonce.type_transaction === 'LOCATION' || annonce.type_transaction === 'location') && (
                                <span className="text-sm font-normal text-neutral-500">{t('common.perMonth')}</span>
                              )}
                              {(annonce.type_transaction === 'LOCATION_COURTE' || annonce.type_transaction === 'location_courte') && (
                                <span className="text-sm font-normal text-purple-500">{t('common.perDay')}</span>
                              )}
                            </span>
                            {(annonce.type_transaction === 'LOCATION_COURTE' || annonce.type_transaction === 'location_courte') && (
                              <span className="text-xs text-purple-600 bg-purple-100 dark:bg-purple-500/10 px-2 py-0.5 rounded">
                                {t('myListings.shortRental')}
                              </span>
                            )}
                            <span className="text-sm text-neutral-500 bg-neutral-100 dark:bg-dark-bg px-2 py-0.5 rounded">
                              {annonce.type_bien}
                            </span>
                          </div>

                          {/* Views */}
                          <div className="flex items-center gap-1.5 text-sm text-neutral-500 mt-2">
                            <Eye className="w-4 h-4" />
                            {t('myListings.views', { count: annonce.vues_count || annonce.vues || 0 })}
                          </div>
                        </div>

                        {/* Actions Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenu(activeMenu === annonce.id ? null : annonce.id)}
                            className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-neutral-500" />
                          </button>

                          <AnimatePresence>
                            {activeMenu === annonce.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-10 w-44 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-neutral-200 dark:border-dark-border py-2 z-10 max-h-[60vh] overflow-y-auto"
                              >
                                <Link
                                  href={`/bien/${annonce.id}`}
                                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-dark-bg text-neutral-700 dark:text-neutral-300"
                                >
                                  <Eye className="w-4 h-4" />
                                  {t('myListings.actions.viewListing')}
                                </Link>
                                <Link
                                  href={`/mes-annonces/${annonce.id}/modifier`}
                                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-dark-bg text-neutral-700 dark:text-neutral-300"
                                >
                                  <Edit className="w-4 h-4" />
                                  {t('myListings.actions.edit')}
                                </Link>
                                {/* Mark as rented - only for ACTIVE listings */}
                                {annonce.statut === 'ACTIVE' && (
                                  <button
                                    onClick={() => handleMarkAsRented(annonce.id)}
                                    disabled={markAsRentedMutation.isPending}
                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 dark:hover:bg-green-500/10 text-green-600 w-full disabled:opacity-50"
                                  >
                                    {markAsRentedMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4" />
                                    )}
                                    {t('myListings.actions.markAsRented')}
                                  </button>
                                )}
                                {/* Reactivate - only for ARCHIVEE or EXPIREE listings */}
                                {(annonce.statut === 'ARCHIVEE' || annonce.statut === 'EXPIREE') && (
                                  <button
                                    onClick={() => handleReactivate(annonce.id)}
                                    disabled={reactivateMutation.isPending}
                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 w-full disabled:opacity-50"
                                  >
                                    {reactivateMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Clock className="w-4 h-4" />
                                    )}
                                    {t('myListings.actions.reactivate')}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(annonce.id)}
                                  disabled={deleteMutation.isPending}
                                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 w-full disabled:opacity-50"
                                >
                                  {deleteMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                  {t('myListings.actions.delete')}
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Close menu on outside click */}
      {activeMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setActiveMenu(null)} />
      )}

      {/* Mark as Rented Modal */}
      <AnimatePresence>
        {showRentedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowRentedModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {t('myListings.markAsRentedModal.title')}
                </h3>
                <button
                  onClick={() => setShowRentedModal(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              {/* Question */}
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                {t('myListings.markAsRentedModal.question')}
              </p>

              {/* Options */}
              <div className="space-y-3">
                {/* Via ImmoGuinee */}
                <button
                  onClick={() => confirmMarkAsRented(true)}
                  disabled={markAsRentedMutation.isPending}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-primary-500 bg-primary-50 dark:bg-primary-500/10 hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors disabled:opacity-50"
                >
                  <div className="p-3 bg-primary-500 rounded-xl">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-primary-700 dark:text-primary-400">
                      {t('myListings.markAsRentedModal.viaImmoguinee')}
                    </p>
                    <p className="text-sm text-primary-600/70 dark:text-primary-400/70">
                      {t('myListings.markAsRentedModal.viaImmoguineeDesc')}
                    </p>
                  </div>
                  {markAsRentedMutation.isPending && (
                    <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                  )}
                </button>

                {/* External */}
                <button
                  onClick={() => confirmMarkAsRented(false)}
                  disabled={markAsRentedMutation.isPending}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-neutral-200 dark:border-dark-border hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors disabled:opacity-50"
                >
                  <div className="p-3 bg-neutral-200 dark:bg-dark-bg rounded-xl">
                    <Users className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {t('myListings.markAsRentedModal.external')}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-500">
                      {t('myListings.markAsRentedModal.externalDesc')}
                    </p>
                  </div>
                  {markAsRentedMutation.isPending && (
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                  )}
                </button>
              </div>

              {/* Cancel button */}
              <button
                onClick={() => setShowRentedModal(false)}
                className="w-full mt-4 py-3 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-xl transition-colors"
              >
                {t('myListings.markAsRentedModal.cancel')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
