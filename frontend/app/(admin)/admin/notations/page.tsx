'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import apiClient from '@/lib/api/client';
import {
  Star,
  Eye,
  Flag,
  CheckCircle,
  XCircle,
  Filter,
  MessageSquare,
  Trash2,
  X,
  User,
  Phone,
  Mail,
  FileText,
  Home,
  Calendar,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { ColoredStatsCard } from '@/components/ui/StatsCard';
import { toast } from 'react-hot-toast';

interface Rating {
  id: string;
  note: number;
  commentaire: string;
  is_published: boolean;
  is_flagged: boolean;
  flag_reason?: string;
  created_at: string;
  evaluateur?: {
    id: string;
    nom_complet: string;
    telephone: string;
    email?: string;
  };
  evalue?: {
    id: string;
    nom_complet: string;
    telephone: string;
    email?: string;
  };
  contract?: {
    id: string;
    numero_contrat?: string;
    reference?: string;
    listing?: {
      id: string;
      titre: string;
    };
  };
}

export default function NotationsPage() {
  const [filters, setFilters] = useState<{ is_flagged?: boolean; page?: number }>({});
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ratingToDelete, setRatingToDelete] = useState<Rating | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'ratings', filters],
    queryFn: async () => {
      const response = await apiClient.get('/admin/ratings', { params: filters });
      return response.data;
    },
  });

  // Fetch rating details
  const { data: ratingDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['admin', 'rating', selectedRating?.id],
    queryFn: async () => {
      const response = await apiClient.get(`/admin/ratings/${selectedRating?.id}`);
      return response.data;
    },
    enabled: !!selectedRating?.id,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (ratingId: string) => {
      const response = await apiClient.post(`/admin/ratings/${ratingId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Notation approuvée');
      queryClient.invalidateQueries({ queryKey: ['admin', 'ratings'] });
      setSelectedRating(null);
    },
    onError: () => {
      toast.error('Erreur lors de l\'approbation');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (ratingId: string) => {
      const response = await apiClient.post(`/admin/ratings/${ratingId}/reject`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Notation rejetée');
      queryClient.invalidateQueries({ queryKey: ['admin', 'ratings'] });
      setSelectedRating(null);
    },
    onError: () => {
      toast.error('Erreur lors du rejet');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ratingId: string) => {
      const response = await apiClient.delete(`/admin/ratings/${ratingId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Notation supprimée');
      queryClient.invalidateQueries({ queryKey: ['admin', 'ratings'] });
      setShowDeleteModal(false);
      setRatingToDelete(null);
      setSelectedRating(null);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const ratings = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const flaggedCount = ratings.filter((r: Rating) => r.is_flagged).length;
  const averageRating = ratings.length > 0
    ? (ratings.reduce((acc: number, r: Rating) => acc + r.note, 0) / ratings.length).toFixed(1)
    : '0.0';
  const detail: Rating | null = ratingDetails?.data || null;

  const renderStars = (note: number, size: 'sm' | 'md' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={clsx(
              sizeClass,
              star <= note
                ? 'fill-warning-400 text-warning-400'
                : 'text-neutral-300 dark:text-neutral-600'
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Star className="w-7 h-7 text-warning-500" />
          Gestion des notations
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Modérez les avis et notations des utilisateurs
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ColoredStatsCard title="Total des avis" value={total} change={0} color="secondary" />
        <ColoredStatsCard title="Avis signalés" value={flaggedCount} change={0} color="pink" />
        <ColoredStatsCard title="Note moyenne" value={averageRating} change={0} color="purple" />
        <ColoredStatsCard title="Avis ce mois" value={Math.floor(total * 0.2)} change={0} color="success" />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft">
        <div className="flex flex-wrap gap-4 items-center">
          <Filter className="w-5 h-5 text-neutral-400" />
          <select
            value={filters.is_flagged === true ? 'true' : filters.is_flagged === false ? 'false' : ''}
            onChange={(e) => setFilters({
              ...filters,
              is_flagged: e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined,
              page: 1
            })}
            className="px-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Tous les avis</option>
            <option value="true">Signalés uniquement</option>
            <option value="false">Non signalés</option>
          </select>
          {filters.is_flagged !== undefined && (
            <button
              onClick={() => setFilters({})}
              className="text-sm text-primary-500 hover:text-primary-600 font-medium"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Ratings List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {ratings.map((rating: Rating) => (
            <div
              key={rating.id}
              className={clsx(
                'bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft',
                rating.is_flagged && 'border-l-4 border-error-500'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    {renderStars(rating.note)}
                    {rating.is_flagged && (
                      <span className="px-2 py-1 text-xs font-medium bg-error-100 dark:bg-error-500/10 text-error-700 dark:text-error-400 rounded-full flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        Signalé
                      </span>
                    )}
                    {!rating.is_published && (
                      <span className="px-2 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full">
                        Non publié
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-warning-100 to-warning-200 dark:from-warning-500/20 dark:to-warning-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                    </div>
                    <p className="text-neutral-700 dark:text-neutral-300">{rating.commentaire}</p>
                  </div>

                  <div className="flex flex-wrap gap-6 text-sm text-neutral-500">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">Par:</span>
                      {rating.evaluateur?.nom_complet || 'Anonyme'}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">Pour:</span>
                      {rating.evalue?.nom_complet || '-'}
                    </div>
                    {rating.contract && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">Contrat:</span>
                        {rating.contract.numero_contrat || rating.contract.reference || rating.contract.id.slice(0, 8)}
                      </div>
                    )}
                    <div>{new Date(rating.created_at).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setSelectedRating(rating)}
                    className="p-2 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
                    title="Voir détails"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  {rating.is_flagged ? (
                    <button
                      onClick={() => approveMutation.mutate(rating.id)}
                      disabled={approveMutation.isPending}
                      className="p-2 bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 rounded-lg hover:bg-success-100 dark:hover:bg-success-500/20 transition-colors disabled:opacity-50"
                      title="Approuver"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => rejectMutation.mutate(rating.id)}
                      disabled={rejectMutation.isPending}
                      className="p-2 bg-warning-50 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400 rounded-lg hover:bg-warning-100 dark:hover:bg-warning-500/20 transition-colors disabled:opacity-50"
                      title="Rejeter"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setRatingToDelete(rating);
                      setShowDeleteModal(true);
                    }}
                    className="p-2 bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 rounded-lg hover:bg-error-100 dark:hover:bg-error-500/20 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {ratings.length === 0 && (
            <div className="bg-white dark:bg-dark-card rounded-2xl p-12 text-center shadow-soft">
              <Star className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p className="text-neutral-500">Aucune notation trouvée</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {data?.data?.last_page > 1 && (
        <div className="flex items-center justify-between">
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
        </div>
      )}

      {/* Detail Modal */}
      {selectedRating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-dark-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-warning-100 dark:bg-warning-500/10 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-warning-600 dark:text-warning-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">
                    Détails de la notation
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {renderStars(detail?.note || selectedRating.note, 'sm')}
                    <span className="text-sm text-neutral-500">
                      ({detail?.note || selectedRating.note}/5)
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedRating(null)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingDetails ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Status */}
                  <div className="flex flex-wrap gap-3">
                    {(detail?.is_flagged || selectedRating.is_flagged) && (
                      <span className="px-3 py-1 text-sm font-medium bg-error-100 dark:bg-error-500/10 text-error-700 dark:text-error-400 rounded-full flex items-center gap-1">
                        <Flag className="w-4 h-4" />
                        Signalé
                      </span>
                    )}
                    {(detail?.is_published || selectedRating.is_published) ? (
                      <span className="px-3 py-1 text-sm font-medium bg-success-100 dark:bg-success-500/10 text-success-700 dark:text-success-400 rounded-full">
                        Publié
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full">
                        Non publié
                      </span>
                    )}
                  </div>

                  {/* Commentaire */}
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Commentaire</p>
                    <div className="bg-neutral-50 dark:bg-dark-hover rounded-xl p-4">
                      <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                        {detail?.commentaire || selectedRating.commentaire}
                      </p>
                    </div>
                  </div>

                  {/* Flag reason if exists */}
                  {(detail?.flag_reason || selectedRating.flag_reason) && (
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Raison du signalement</p>
                      <div className="bg-error-50 dark:bg-error-500/10 rounded-xl p-4 border-l-4 border-error-500">
                        <p className="text-error-700 dark:text-error-300">
                          {detail?.flag_reason || selectedRating.flag_reason}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Evaluateur & Evalué */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Evaluateur */}
                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4">
                      <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3 font-medium">
                        Auteur de l'avis
                      </p>
                      {(detail?.evaluateur || selectedRating.evaluateur) ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {detail?.evaluateur?.nom_complet || selectedRating.evaluateur?.nom_complet}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-blue-500" />
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              {detail?.evaluateur?.telephone || selectedRating.evaluateur?.telephone}
                            </span>
                          </div>
                          {(detail?.evaluateur?.email || selectedRating.evaluateur?.email) && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-blue-500" />
                              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                {detail?.evaluateur?.email || selectedRating.evaluateur?.email}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-neutral-400">Anonyme</p>
                      )}
                    </div>

                    {/* Evalué */}
                    <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-4">
                      <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wider mb-3 font-medium">
                        Utilisateur noté
                      </p>
                      {(detail?.evalue || selectedRating.evalue) ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-green-500" />
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {detail?.evalue?.nom_complet || selectedRating.evalue?.nom_complet}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              {detail?.evalue?.telephone || selectedRating.evalue?.telephone}
                            </span>
                          </div>
                          {(detail?.evalue?.email || selectedRating.evalue?.email) && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                                {detail?.evalue?.email || selectedRating.evalue?.email}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-neutral-400">Non renseigné</p>
                      )}
                    </div>
                  </div>

                  {/* Contrat lié */}
                  {(detail?.contract || selectedRating.contract) && (
                    <div className="bg-neutral-50 dark:bg-dark-hover rounded-xl p-4">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3 font-medium">Contrat lié</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-neutral-500" />
                          <span className="text-sm text-neutral-700 dark:text-neutral-300">
                            Réf: {detail?.contract?.numero_contrat || detail?.contract?.reference || selectedRating.contract?.numero_contrat || selectedRating.contract?.id?.slice(0, 8)}
                          </span>
                        </div>
                        {detail?.contract?.listing && (
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4 text-neutral-500" />
                            <span className="text-sm text-neutral-700 dark:text-neutral-300">
                              {detail.contract.listing.titre}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Créé le {new Date(detail?.created_at || selectedRating.created_at).toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-dark-border shrink-0 flex justify-between">
              <button
                onClick={() => {
                  setRatingToDelete(selectedRating);
                  setShowDeleteModal(true);
                }}
                className="px-4 py-2 bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 rounded-xl hover:bg-error-100 dark:hover:bg-error-500/20 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
              <div className="flex gap-3">
                {(selectedRating.is_flagged) ? (
                  <button
                    onClick={() => approveMutation.mutate(selectedRating.id)}
                    disabled={approveMutation.isPending}
                    className="px-4 py-2 bg-success-500 text-white rounded-xl hover:bg-success-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {approveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    <CheckCircle className="w-4 h-4" />
                    Approuver
                  </button>
                ) : (
                  <button
                    onClick={() => rejectMutation.mutate(selectedRating.id)}
                    disabled={rejectMutation.isPending}
                    className="px-4 py-2 bg-warning-500 text-white rounded-xl hover:bg-warning-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {rejectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    <XCircle className="w-4 h-4" />
                    Rejeter
                  </button>
                )}
                <button
                  onClick={() => setSelectedRating(null)}
                  className="px-4 py-2 bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && ratingToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="w-16 h-16 bg-error-100 dark:bg-error-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-error-600 dark:text-error-400" />
              </div>
              <h3 className="text-xl font-semibold text-center text-neutral-900 dark:text-white mb-2">
                Supprimer cette notation ?
              </h3>
              <p className="text-center text-neutral-600 dark:text-neutral-400 mb-6">
                Cette action est irréversible. La notation de <strong>{ratingToDelete.evaluateur?.nom_complet || 'Anonyme'}</strong> pour <strong>{ratingToDelete.evalue?.nom_complet || 'Utilisateur'}</strong> sera définitivement supprimée.
              </p>

              <div className="bg-neutral-50 dark:bg-dark-hover rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(ratingToDelete.note, 'sm')}
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                  "{ratingToDelete.commentaire}"
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setRatingToDelete(null);
                  }}
                  className="flex-1 px-4 py-3 bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={() => deleteMutation.mutate(ratingToDelete.id)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-3 bg-error-500 text-white rounded-xl hover:bg-error-600 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
