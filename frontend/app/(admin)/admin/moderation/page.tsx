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
        <h1 className="text-2xl font-bold text-gray-900">File de modération</h1>
        <p className="text-gray-600 mt-1">Examinez et modérez les annonces signalées ou en attente</p>
      </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={filter.status || ''}
              onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="SIGNALE">Signalé</option>
              <option value="SUSPENDU">Suspendu</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Signalements</label>
            <button
              onClick={() => setFilter({ ...filter, reported: !filter.reported })}
              className={clsx(
                'px-4 py-2 rounded-lg border transition-colors',
                filter.reported
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-white border-gray-300 text-gray-700'
              )}
            >
              Signalés uniquement
            </button>
          </div>
        </div>

        {/* Listings */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">File de modération vide</h3>
            <p className="text-gray-500">Aucune annonce nécessitant une modération</p>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing: any) => (
              <div key={listing.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex gap-6">
                  {/* Photo */}
                  <div className="w-32 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    {listing.photos?.[0]?.url ? (
                      <img
                        src={listing.photos[0].url}
                        alt={listing.titre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
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
                        <h3 className="font-medium text-gray-900">{listing.titre}</h3>
                        <p className="text-sm text-gray-500">
                          {listing.type_bien} • {listing.quartier}, {listing.ville}
                        </p>
                        <p className="text-lg font-bold text-gray-900 mt-1">
                          {formatMoney(listing.prix_loyer_gnf)}/mois
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', getStatusColor(listing.statut))}>
                          {listing.statut}
                        </span>
                        {listing.signalements_count > 0 && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            {listing.signalements_count} signalement(s)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-gray-500">
                      <span>Par: {listing.proprietaire?.nom_complet}</span>
                      <span className="mx-2">•</span>
                      <span>Créé le {new Date(listing.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {selectedListing === listing.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={moderationReason}
                        onChange={(e) => setModerationReason(e.target.value)}
                        placeholder="Raison de la modération..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleModerate(listing.id, 'approve')}
                          disabled={moderateMutation.isPending}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Approuver
                        </button>
                        <button
                          onClick={() => handleModerate(listing.id, 'reject')}
                          disabled={moderateMutation.isPending || !moderationReason}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          Rejeter
                        </button>
                        <button
                          onClick={() => handleModerate(listing.id, 'suspend')}
                          disabled={moderateMutation.isPending || !moderationReason}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                        >
                          Suspendre
                        </button>
                        <button
                          onClick={() => {
                            setSelectedListing(null);
                            setModerationReason('');
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedListing(listing.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Modérer
                      </button>
                      <a
                        href={`/bien/${listing.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
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
          <p className="text-sm text-gray-500">
            Page 1 sur {data?.meta?.last_page || data?.data?.last_page} • {data?.meta?.total || data?.data?.total} résultats
          </p>
        </div>
      )}
    </div>
  );
}
