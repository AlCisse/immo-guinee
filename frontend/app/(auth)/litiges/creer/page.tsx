'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import DisputeForm from '@/components/disputes/DisputeForm';

// T214: Dispute creation page

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
  date_debut: string;
  date_fin: string;
}

async function fetchUserContracts(): Promise<Contract[]> {
  const response = await apiClient.get('/contracts/user');
  return response.data.data || [];
}

export default function CreateDisputePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedContractId = searchParams.get('contract');

  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    preselectedContractId
  );

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', 'user'],
    queryFn: fetchUserContracts,
  });

  const selectedContract = contracts?.find((c) => c.id === selectedContractId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
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
          <h1 className="text-2xl font-bold text-gray-900">Ouvrir un litige</h1>
          <p className="text-gray-600 mt-1">
            Signalez un problème lié à un de vos contrats
          </p>
        </div>

        {/* Contract Selection */}
        {!selectedContractId && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Sélectionnez un contrat</h2>

            {contracts && contracts.length > 0 ? (
              <div className="space-y-3">
                {contracts.map((contract) => (
                  <button
                    key={contract.id}
                    onClick={() => setSelectedContractId(contract.id)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50/50 transition-all text-left"
                  >
                    <div className="flex items-start gap-4">
                      {contract.listing.photo_principale_url && (
                        <img
                          src={contract.listing.photo_principale_url}
                          alt={contract.listing.titre}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {contract.listing.titre}
                        </p>
                        <p className="text-sm text-gray-500">
                          Contrat #{contract.reference}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>Du {new Date(contract.date_debut).toLocaleDateString('fr-FR')}</span>
                          <span>au {new Date(contract.date_fin).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-gray-500 mb-4">Aucun contrat actif trouvé</p>
                <button
                  onClick={() => router.push('/annonces')}
                  className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Parcourir les annonces
                </button>
              </div>
            )}
          </div>
        )}

        {/* Selected Contract + Form */}
        {selectedContractId && selectedContract && (
          <>
            {/* Contract Info Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <div className="flex items-start gap-4">
                {selectedContract.listing.photo_principale_url && (
                  <img
                    src={selectedContract.listing.photo_principale_url}
                    alt={selectedContract.listing.titre}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {selectedContract.listing.titre}
                  </p>
                  <p className="text-sm text-gray-500">
                    Contrat #{selectedContract.reference}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">Propriétaire:</span>
                    <span className="text-sm font-medium">
                      {selectedContract.bailleur.nom_complet}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedContractId(null)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Changer
                </button>
              </div>
            </div>

            {/* Dispute Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <DisputeForm
                contractId={selectedContractId}
                onSuccess={(disputeId) => {
                  router.push(`/dashboard/mes-litiges?created=${disputeId}`);
                }}
                onCancel={() => router.back()}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
