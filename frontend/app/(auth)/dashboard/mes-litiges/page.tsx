'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import {
  useUserDisputes,
  Dispute,
  DisputeStatus,
  getStatusLabel,
  getStatusColor,
  getCategoryLabel,
  formatDisputeDate,
  isDisputeActive,
} from '@/lib/hooks/useDisputes';

// T216: Disputes list page

type FilterStatus = 'all' | 'active' | 'resolved';

function DisputeCard({ dispute }: { dispute: Dispute }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/litiges/${dispute.id}`)}
      className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-primary-300 hover:shadow-sm transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">#{dispute.reference_litige}</span>
            <span
              className={clsx(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                getStatusColor(dispute.statut)
              )}
            >
              {getStatusLabel(dispute.statut)}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{getCategoryLabel(dispute.categorie)}</p>
        </div>
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Motif */}
      <p className="text-gray-700 mb-3 line-clamp-2">{dispute.motif}</p>

      {/* Contract Info */}
      <div className="p-3 bg-gray-50 rounded-lg mb-3">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Contrat:</span> {dispute.contract.reference}
        </p>
        <p className="text-sm text-gray-500 truncate">{dispute.contract.listing.titre}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-gray-500">
          <span>Ouvert le {formatDisputeDate(dispute.created_at)}</span>
        </div>
        {dispute.mediateur && (
          <div className="flex items-center gap-1 text-primary-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="text-sm">Médiateur assigné</span>
          </div>
        )}
      </div>

      {/* Parties */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-700 text-xs font-medium">
              {dispute.plaignant.nom_complet.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Plaignant</p>
            <p className="text-sm font-medium text-gray-900">{dispute.plaignant.nom_complet}</p>
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
        <div className="flex items-center gap-2">
          <div>
            <p className="text-xs text-gray-500 text-right">Défendeur</p>
            <p className="text-sm font-medium text-gray-900">{dispute.defendeur.nom_complet}</p>
          </div>
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <span className="text-orange-700 text-xs font-medium">
              {dispute.defendeur.nom_complet.charAt(0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MesLitigesPage() {
  const searchParams = useSearchParams();
  const createdId = searchParams.get('created');

  const [filter, setFilter] = useState<FilterStatus>('all');
  const { data: disputes, isLoading } = useUserDisputes();

  const filteredDisputes = disputes?.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'active') return isDisputeActive(d.statut);
    if (filter === 'resolved') return !isDisputeActive(d.statut);
    return true;
  });

  const activeCount = disputes?.filter((d) => isDisputeActive(d.statut)).length || 0;
  const resolvedCount = disputes?.filter((d) => !isDisputeActive(d.statut)).length || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes litiges</h1>
            <p className="text-gray-600">Suivez et gérez vos litiges en cours</p>
          </div>
          <Link
            href="/litiges/creer"
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau litige
          </Link>
        </div>

        {/* Success Message */}
        {createdId && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="font-medium text-green-800">Litige créé avec succès</p>
              <p className="text-sm text-green-700">
                Un médiateur sera assigné sous 24h. Vous recevrez une notification.
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            )}
          >
            Tous ({disputes?.length || 0})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === 'active'
                ? 'bg-yellow-500 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            )}
          >
            En cours ({activeCount})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === 'resolved'
                ? 'bg-green-500 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            )}
          >
            Résolus ({resolvedCount})
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredDisputes && filteredDisputes.length > 0 ? (
          <div className="space-y-4">
            {filteredDisputes.map((dispute) => (
              <DisputeCard key={dispute.id} dispute={dispute} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <svg
              className="w-20 h-20 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all'
                ? 'Aucun litige'
                : filter === 'active'
                ? 'Aucun litige en cours'
                : 'Aucun litige résolu'}
            </h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all'
                ? "Vous n'avez pas encore de litige enregistré"
                : 'Aucun litige ne correspond à ce filtre'}
            </p>
            {filter === 'all' && (
              <Link
                href="/litiges/creer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Signaler un problème
              </Link>
            )}
          </div>
        )}

        {/* Help Card */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex gap-4">
            <svg className="w-8 h-8 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium text-blue-900">Comment fonctionne la médiation ?</h3>
              <ul className="mt-2 text-sm text-blue-800 space-y-1">
                <li>1. Vous ouvrez un litige avec preuves à l'appui</li>
                <li>2. Un médiateur impartial est assigné sous 24h</li>
                <li>3. Les deux parties sont invitées à échanger</li>
                <li>4. Le médiateur propose une résolution</li>
                <li>5. En cas d'échec, le litige peut être escaladé</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
