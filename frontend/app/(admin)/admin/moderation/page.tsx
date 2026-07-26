'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { useModerationQueue, useModerate, getStatusColor, formatMoney, ModerationAction } from '@/lib/hooks/useAdmin';

// T252: Admin Moderation page

export default function ModerationPage() {
  const [filter, setFilter] = useState<{ status?: string; reported?: boolean }>({});
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [moderationReason, setModerationReason] = useState('');

  const { data, isLoading, refetch } = useModerationQueue(filter);
  const moderateMutation = useModerate();

  // Handle both paginated and non-paginated responses
  const listings = Array.isArray(data?.data?.data) ? data.data.data : Array.isArray(data?.data) ? data.data : [];

  const handleModerate = async (listingId: string, action: ModerationAction['action']) => {
    if ((action === 'reject' || action === 'suspend') && !moderationReason) {
      alert('Veuillez fournir une raison');
      return;
    }

    await moderateMutation.mutateAsync({
      listingId,
      action: {
        action,
        reason: action === 'approve' || action === 'delete' ? undefined : moderationReason,
      },
    });

    setSelectedListing(null);
    setModerationReason('');
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">File de modération</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">Examinez et modérez les annonces signalées ou en attente</p>
      </div>

        {/* Filters */}
        <div className="bg-white dark:bg-dark-card rounded-xl p-4 mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Statut</label>
            <select
              value={filter.status || ''}
              onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
              className="px-3 py-2 border border-neutral-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-secondary-500"
            >
              <option value="">Tous</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="SIGNALE">Signalé</option>
              <option value="SUSPENDU">Suspendu</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Signalements</label>
            <button
              onClick={() => setFilter({ ...filter, reported: !filter.reported })}
              className={clsx(
                'px-4 py-2 rounded-lg border transition-colors',
                filter.reported
                  ? 'bg-error-50 border-error-200 text-error-700'
                  : 'bg-white dark:bg-dark-card border-neutral-300 dark:border-dark-border text-neutral-700 dark:text-neutral-300'
              )}
            >
              Signalés uniquement
            </button>
          </div>
        </div>

        {/* Listings */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary-600" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-dark-card rounded-xl">
            <svg className="w-12 h-12 text-success-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white">File de modération vide</h3>
            <p className="text-neutral-500 dark:text-neutral-400">Aucune annonce nécessitant une modération</p>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing: any) => (
              <div key={listing.id} className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-neutral-100 dark:border-dark-border">
                <div className="flex gap-6">
                  {/* Photo */}
                  <div className="w-32 h-24 bg-neutral-200 dark:bg-dark-hover rounded-lg overflow-hidden flex-shrink-0">
                    {listing.photos?.[0]?.url ? (
                      <img
                        src={listing.photos[0].url}
                        alt={listing.titre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-neutral-900 dark:text-white">{listing.titre}</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          {listing.type_bien} • {listing.quartier}, {listing.ville}
                        </p>
                        <p className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
                          {formatMoney(listing.prix_loyer_gnf)}/mois
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', getStatusColor(listing.statut))}>
                          {listing.statut}
                        </span>
                        {listing.signalements_count > 0 && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-error-100 text-error-700">
                            {listing.signalements_count} signalement(s)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                      <span>Par: {listing.proprietaire?.nom_complet}</span>
                      <span className="mx-2">•</span>
                      <span>Créé le {new Date(listing.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-dark-border">
                  {selectedListing === listing.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={moderationReason}
                        onChange={(e) => setModerationReason(e.target.value)}
                        placeholder="Raison de la modération..."
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-secondary-500 resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleModerate(listing.id, 'approve')}
                          disabled={moderateMutation.isPending}
                          className="px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50"
                        >
                          Approuver
                        </button>
                        <button
                          onClick={() => handleModerate(listing.id, 'reject')}
                          disabled={moderateMutation.isPending || !moderationReason}
                          className="px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 disabled:opacity-50"
                        >
                          Rejeter
                        </button>
                        <button
                          onClick={() => handleModerate(listing.id, 'suspend')}
                          disabled={moderateMutation.isPending || !moderationReason}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                        >
                          Suspendre
                        </button>
                        <button
                          onClick={() => {
                            setSelectedListing(null);
                            setModerationReason('');
                          }}
                          className="px-4 py-2 bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:bg-dark-hover"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedListing(listing.id)}
                        className="px-4 py-2 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700"
                      >
                        Modérer
                      </button>
                      <a
                        href={`/bien/${listing.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:bg-dark-hover"
                      >
                        Voir l&apos;annonce
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Pagination */}
      {data && (data?.meta?.last_page > 1 || data?.data?.last_page > 1) && (
        <div className="flex justify-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Page 1 sur {data?.meta?.last_page || data?.data?.last_page} • {data?.meta?.total || data?.data?.total} résultats
          </p>
        </div>
      )}
    </div>
  );
}
