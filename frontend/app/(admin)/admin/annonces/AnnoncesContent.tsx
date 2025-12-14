'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Building2,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Loader2,
  X,
  CheckCircle,
  Clock,
  Ban,
  User,
  Calendar,
  DollarSign,
  Home,
  AlertTriangle,
} from 'lucide-react';
import { ColoredStatsCard } from '@/components/ui/StatsCard';
import { api } from '@/lib/api/client';
import { getStatusColor, propertyTypeLabels, formatMoney, statusLabels } from '@/lib/colors';
import { clsx } from 'clsx';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface Listing {
  id: string;
  titre: string;
  description?: string;
  type_bien: string;
  loyer_mensuel: number;
  ville: string;
  quartier: string;
  statut: string;
  disponible: boolean;
  created_at: string;
  user?: {
    id: string;
    nom_complet: string;
    telephone: string;
  };
}

const STATUS_ACTIONS = [
  {
    action: 'approve',
    label: 'Approuver',
    description: 'Rendre visible au public',
    icon: CheckCircle,
    color: 'bg-green-500 hover:bg-green-600',
    targetStatus: 'ACTIVE'
  },
  {
    action: 'suspend',
    label: 'Suspendre',
    description: 'Masquer temporairement',
    icon: Clock,
    color: 'bg-orange-500 hover:bg-orange-600',
    targetStatus: 'SUSPENDU'
  },
  {
    action: 'delete',
    label: 'Supprimer',
    description: 'Supprimer définitivement',
    icon: Ban,
    color: 'bg-red-500 hover:bg-red-600',
    targetStatus: null
  },
];

export default function AnnoncesContent() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{
    search?: string;
    statut?: string;
    type_bien?: string;
    page?: number;
  }>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Listing | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'listings', filters],
    queryFn: async () => {
      const response = await api.admin.listings(filters);
      return response.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.admin.deleteListing(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
      toast.success('Annonce supprimée avec succès');
      setDeletingId(null);
      setSelectedListing(null);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
      setDeletingId(null);
    },
  });

  // Moderation mutation
  const moderateMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: string; reason?: string }) => {
      const response = await api.admin.moderateListing(id, { action, reason });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
      const messages: Record<string, string> = {
        approve: 'Annonce approuvée',
        suspend: 'Annonce suspendue',
        delete: 'Annonce supprimée',
      };
      toast.success(messages[variables.action] || 'Action effectuée');
      setSelectedListing(null);
      setModerationReason('');
    },
    onError: () => {
      toast.error('Erreur lors de la modération');
    },
  });

  const handleDelete = (listing: Listing) => {
    setDeleteConfirm(listing);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      setDeletingId(deleteConfirm.id);
      deleteMutation.mutate(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleOpenModal = (listing: Listing) => {
    setSelectedListing(listing);
    setModerationReason('');
  };

  const handleModerate = (action: string) => {
    if (!selectedListing) return;

    const confirmMessages: Record<string, string> = {
      approve: 'Approuver cette annonce ?',
      suspend: 'Suspendre cette annonce ?',
      delete: 'Supprimer définitivement cette annonce ?',
    };

    if (confirm(confirmMessages[action])) {
      moderateMutation.mutate({
        id: selectedListing.id,
        action,
        reason: moderationReason || undefined,
      });
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setFilters({ ...filters, search: formData.get('search') as string, page: 1 });
  };

  const listings = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const activeCount = listings.filter((l: Listing) => l.statut === 'ACTIVE').length;
  const pendingCount = listings.filter((l: Listing) => l.statut === 'EN_ATTENTE').length;

  // Filter actions based on current status
  const getAvailableActions = (statut: string) => {
    return STATUS_ACTIONS.filter(action => {
      if (action.action === 'approve' && statut === 'ACTIVE') return false;
      if (action.action === 'suspend' && statut === 'SUSPENDU') return false;
      return true;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Building2 className="w-7 h-7 text-primary-500" />
          Gestion des annonces
        </h1>
        <p className="text-gray-600 mt-1">
          Gérez toutes les annonces de la plateforme
        </p>
      </div>

      {/* Content */}
      <div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Stats Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ColoredStatsCard
                title="Total annonces"
                value={total}
                change={15}
                color="secondary"
              />
              <ColoredStatsCard
                title="Annonces actives"
                value={activeCount}
                change={8}
                color="success"
              />
              <ColoredStatsCard
                title="En attente"
                value={pendingCount}
                change={-3}
                color="pink"
              />
              <ColoredStatsCard
                title="Vues ce mois"
                value="12.4K"
                change={22}
                color="purple"
              />
            </motion.div>

            {/* Search & Filters */}
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft"
            >
              <form onSubmit={handleSearch} className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    name="search"
                    placeholder="Rechercher par titre, ville, quartier..."
                    className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
                >
                  Rechercher
                </button>
              </form>

              <div className="flex flex-wrap gap-4 items-center">
                <Filter className="w-5 h-5 text-neutral-400" />
                <select
                  value={filters.statut || ''}
                  onChange={(e) => setFilters({ ...filters, statut: e.target.value || undefined, page: 1 })}
                  className="px-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous les statuts</option>
                  <option value="ACTIVE">Active</option>
                  <option value="EN_ATTENTE">En attente</option>
                  <option value="SUSPENDU">Suspendu</option>
                  <option value="LOUEE">Louée</option>
                  <option value="EXPIREE">Expirée</option>
                </select>

                <select
                  value={filters.type_bien || ''}
                  onChange={(e) => setFilters({ ...filters, type_bien: e.target.value || undefined, page: 1 })}
                  className="px-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous les types</option>
                  <option value="APPARTEMENT">Appartement</option>
                  <option value="MAISON">Maison</option>
                  <option value="STUDIO">Studio</option>
                  <option value="VILLA">Villa</option>
                  <option value="BUREAU">Bureau</option>
                  <option value="MAGASIN">Magasin</option>
                  <option value="TERRAIN">Terrain</option>
                </select>

                {(filters.statut || filters.type_bien || filters.search) && (
                  <button
                    onClick={() => setFilters({})}
                    className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            </motion.div>

            {/* Listings Grid */}
            <motion.div variants={itemVariants}>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                </div>
              ) : (
                <div className="grid gap-4">
                  {listings.map((listing: Listing, index: number) => (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-soft hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-500/20 dark:to-primary-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-7 h-7 text-primary-600 dark:text-primary-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                                {listing.titre}
                              </h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-neutral-500">
                                  {propertyTypeLabels[listing.type_bien] || listing.type_bien}
                                </span>
                                <span className="text-neutral-300">•</span>
                                <span className="flex items-center gap-1 text-sm text-neutral-500">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {listing.ville}, {listing.quartier}
                                </span>
                              </div>
                            </div>

                            <span className={clsx(
                              'px-3 py-1 text-xs font-medium rounded-full flex-shrink-0',
                              getStatusColor(listing.statut)
                            )}>
                              {statusLabels[listing.statut] || listing.statut}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-dark-border">
                            <div className="flex items-center gap-6">
                              <div>
                                <p className="text-sm text-neutral-500">Loyer mensuel</p>
                                <p className="font-semibold text-primary-600 dark:text-primary-400">
                                  {formatMoney(listing.loyer_mensuel)}
                                </p>
                              </div>
                              {listing.user && (
                                <div>
                                  <p className="text-sm text-neutral-500">Propriétaire</p>
                                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                    {listing.user.nom_complet}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-sm text-neutral-500">Publié le</p>
                                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                                  {new Date(listing.created_at).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => window.open(`/bien/${listing.id}`, '_blank')}
                                className="p-2.5 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
                                title="Voir"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenModal(listing)}
                                className="p-2.5 bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 rounded-xl hover:bg-success-100 dark:hover:bg-success-500/20 transition-colors"
                                title="Modérer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(listing)}
                                disabled={deletingId === listing.id}
                                className="p-2.5 bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 rounded-xl hover:bg-error-100 dark:hover:bg-error-500/20 transition-colors disabled:opacity-50"
                                title="Supprimer"
                              >
                                {deletingId === listing.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {listings.length === 0 && (
                    <div className="bg-white dark:bg-dark-card rounded-2xl p-12 text-center">
                      <Building2 className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                      <p className="text-neutral-500">Aucune annonce trouvée</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Pagination */}
            {data?.data?.last_page > 1 && (
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-between"
              >
                <p className="text-sm text-neutral-500">
                  Page {data.data.current_page} sur {data.data.last_page}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                    disabled={!data.data.prev_page_url}
                    className="px-4 py-2 text-sm bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                    disabled={!data.data.next_page_url}
                    className="px-4 py-2 text-sm bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-14 h-14 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                  Supprimer l'annonce ?
                </h3>
                <p className="text-sm text-neutral-500 mb-1">
                  Cette action est irréversible.
                </p>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 line-clamp-1">
                  "{deleteConfirm.titre}"
                </p>
              </div>
              <div className="flex border-t border-neutral-100 dark:border-dark-border">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Moderation Modal */}
      <AnimatePresence>
        {selectedListing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedListing(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-dark-border">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Modérer l'annonce
                </h3>
                <button
                  onClick={() => setSelectedListing(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4">
                {/* Current Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">Statut actuel</span>
                  <span className={clsx(
                    'px-3 py-1 text-xs font-semibold rounded-full',
                    getStatusColor(selectedListing.statut)
                  )}>
                    {statusLabels[selectedListing.statut] || selectedListing.statut}
                  </span>
                </div>

                {/* Listing Info */}
                <div className="p-3 bg-neutral-50 dark:bg-dark-hover rounded-xl space-y-2">
                  <h4 className="font-semibold text-neutral-900 dark:text-white line-clamp-1">
                    {selectedListing.titre}
                  </h4>
                  <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Home className="w-3.5 h-3.5" />
                      {propertyTypeLabels[selectedListing.type_bien] || selectedListing.type_bien}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedListing.ville}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      {formatMoney(selectedListing.loyer_mensuel)}
                    </span>
                  </div>
                  {selectedListing.user && (
                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-200 dark:border-dark-border">
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        {selectedListing.user.nom_complet} • {selectedListing.user.telephone}
                      </span>
                    </div>
                  )}
                </div>

                {/* Reason Input */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Motif (optionnel)
                  </label>
                  <textarea
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    rows={2}
                    placeholder="Raison de la décision..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-bg focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {getAvailableActions(selectedListing.statut).map((actionItem) => (
                    <button
                      key={actionItem.action}
                      onClick={() => handleModerate(actionItem.action)}
                      disabled={moderateMutation.isPending}
                      className={clsx(
                        'flex items-center gap-3 w-full p-3 rounded-xl text-white transition-all disabled:opacity-50',
                        actionItem.color
                      )}
                    >
                      {moderateMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <actionItem.icon className="w-5 h-5" />
                      )}
                      <div className="text-left">
                        <p className="font-semibold text-sm">{actionItem.label}</p>
                        <p className="text-xs opacity-90">{actionItem.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* View Link */}
                <button
                  onClick={() => window.open(`/bien/${selectedListing.id}`, '_blank')}
                  className="flex items-center justify-center gap-2 w-full p-2 text-sm text-primary-500 hover:text-primary-600 font-medium"
                >
                  <Eye className="w-4 h-4" />
                  Voir l'annonce complète
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
