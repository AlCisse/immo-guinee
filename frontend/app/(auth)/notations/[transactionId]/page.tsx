'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import RatingForm from '@/components/ratings/RatingForm';

// T210: Rating submission page

interface Contract {
  id: string;
  reference: string;
  listing: {
    id: string;
    titre: string;
    photo_principale_url: string;
  };
  bailleur: {
    id: string;
    nom_complet: string;
    badge: string;
  };
  locataire: {
    id: string;
    nom_complet: string;
    badge: string;
  };
  date_fin: string;
  has_rating: boolean;
}

async function fetchContract(contractId: string): Promise<Contract> {
  const response = await apiClient.get(`/contracts/${contractId}`);
  return response.data.data;
}

export default function RatingPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.transactionId as string;

  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => fetchContract(contractId),
    enabled: !!contractId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-lg mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-32 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white rounded-xl p-8 text-center">
            <svg
              className="w-16 h-16 text-red-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Contrat introuvable</h2>
            <p className="text-gray-600 mb-6">
              Ce contrat n'existe pas ou vous n'avez pas les droits pour l'évaluer.
            </p>
            <button
              onClick={() => router.push('/dashboard/mes-contrats')}
              className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Voir mes contrats
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (contract.has_rating) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white rounded-xl p-8 text-center">
            <svg
              className="w-16 h-16 text-green-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Déjà évalué</h2>
            <p className="text-gray-600 mb-6">Vous avez déjà laissé un avis pour ce contrat.</p>
            <button
              onClick={() => router.push('/dashboard/mes-contrats')}
              className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Retour aux contrats
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Retour
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Laisser un avis</h1>
          <p className="text-gray-600 mt-1">Partagez votre expérience pour aider la communauté</p>
        </div>

        {/* Contract Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-start gap-4">
            {contract.listing.photo_principale_url && (
              <img
                src={contract.listing.photo_principale_url}
                alt={contract.listing.titre}
                className="w-20 h-20 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{contract.listing.titre}</h3>
              <p className="text-sm text-gray-500">Contrat #{contract.reference}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">Propriétaire:</span>
                <span className="text-sm font-medium">{contract.bailleur.nom_complet}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rating Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <RatingForm
            contractId={contract.id}
            onSuccess={() => {
              router.push('/dashboard/mes-contrats?rated=success');
            }}
            onCancel={() => router.back()}
          />
        </div>
      </div>
    </div>
  );
}
