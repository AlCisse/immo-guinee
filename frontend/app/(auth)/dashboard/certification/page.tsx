'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import BadgeDisplay from '@/components/certifications/BadgeDisplay';
import ProgressTracker from '@/components/certifications/ProgressTracker';
import DocumentUploader from '@/components/certifications/DocumentUploader';

interface CertificationData {
  current_badge: string;
  next_badge: string | null;
  progress: number;
  requirements_met: string[];
  requirements_missing: Array<{
    type: string;
    current: number | string;
    required: number | string;
  }>;
  stats: {
    nombre_transactions: number;
    note_moyenne: number;
    nombre_litiges: number;
    statut_verification: string;
  };
  documents: Array<{
    id: string;
    type_document: string;
    fichier_url: string;
    statut_verification: string;
    commentaire_verification: string | null;
    created_at: string;
  }>;
}

// Badge info
const BADGE_INFO = {
  BRONZE: {
    label: 'Bronze',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Niveau de base pour les nouveaux utilisateurs',
    discount: 0,
  },
  ARGENT: {
    label: 'Argent',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    description: 'CNI vérifiée, 1+ transaction, note 3.5+',
    discount: 5,
  },
  OR: {
    label: 'Or',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    description: 'CNI vérifiée, 5+ transactions, note 4.0+',
    discount: 10,
  },
  DIAMANT: {
    label: 'Diamant',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    description: 'Titre foncier vérifié, 20+ transactions, note 4.5+',
    discount: 15,
  },
};

// Fetch certification data
async function fetchCertification(): Promise<CertificationData> {
  const response = await apiClient.get('/certifications/me');
  return response.data.data;
}

export default function CertificationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'documents'>('overview');

  const { data: certification, isLoading, error } = useQuery<CertificationData>({
    queryKey: ['certification'],
    queryFn: fetchCertification,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">Erreur lors du chargement de la certification</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['certification'] })}
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  const currentBadgeInfo = BADGE_INFO[certification?.current_badge as keyof typeof BADGE_INFO] || BADGE_INFO.BRONZE;
  const nextBadgeInfo = certification?.next_badge
    ? BADGE_INFO[certification.next_badge as keyof typeof BADGE_INFO]
    : null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Programme de Certification</h1>
        <p className="mt-1 text-gray-600">
          Progressez dans les niveaux pour débloquer des avantages exclusifs
        </p>
      </div>

      {/* Current badge display */}
      <div className="mb-8">
        <BadgeDisplay
          badge={certification?.current_badge || 'BRONZE'}
          size="lg"
          showLabel
          showDiscount
        />
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Vue d&apos;ensemble
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'documents'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Mes documents
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Progress to next level */}
          {certification?.next_badge && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Progression vers {nextBadgeInfo?.label}
              </h2>
              <ProgressTracker
                currentBadge={certification.current_badge}
                nextBadge={certification.next_badge}
                progress={certification.progress}
                requirementsMet={certification.requirements_met}
                requirementsMissing={certification.requirements_missing}
              />
            </div>
          )}

          {/* Already at max level */}
          {!certification?.next_badge && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
              <div className="flex items-center">
                <svg className="h-8 w-8 text-blue-600 mr-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-semibold text-blue-800">Niveau maximum atteint !</h3>
                  <p className="text-blue-600">
                    Vous avez atteint le niveau Diamant, le plus haut niveau de certification.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid gap-6 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {certification?.stats?.nombre_transactions || 0}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">Note moyenne</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-gray-900">
                  {certification?.stats?.note_moyenne?.toFixed(1) || '0.0'}
                </p>
                <span className="ml-1 text-yellow-500">&#9733;</span>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">Litiges</p>
              <p className="text-2xl font-bold text-gray-900">
                {certification?.stats?.nombre_litiges || 0}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">Vérification</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {certification?.stats?.statut_verification === 'TITRE_FONCIER_VERIFIE'
                  ? 'Titre foncier vérifié'
                  : certification?.stats?.statut_verification === 'CNI_VERIFIEE'
                  ? 'CNI vérifiée'
                  : 'Non vérifié'}
              </p>
            </div>
          </div>

          {/* All badge levels */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Tous les niveaux</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(BADGE_INFO).map(([badge, info]) => {
                const isCurrentBadge = badge === certification?.current_badge;
                const badgeOrder = ['BRONZE', 'ARGENT', 'OR', 'DIAMANT'];
                const currentIndex = badgeOrder.indexOf(certification?.current_badge || 'BRONZE');
                const thisIndex = badgeOrder.indexOf(badge);
                const isUnlocked = thisIndex <= currentIndex;

                return (
                  <div
                    key={badge}
                    className={`relative rounded-lg border p-4 ${
                      isCurrentBadge
                        ? `${info.bgColor} ${info.borderColor} border-2`
                        : isUnlocked
                        ? 'border-gray-200 bg-white'
                        : 'border-gray-100 bg-gray-50 opacity-60'
                    }`}
                  >
                    {isCurrentBadge && (
                      <span className="absolute -top-2 -right-2 rounded-full bg-primary-500 px-2 py-1 text-xs text-white">
                        Actuel
                      </span>
                    )}
                    <div className="flex items-center mb-2">
                      <BadgeDisplay badge={badge} size="sm" />
                      <span className={`ml-2 font-semibold ${info.color}`}>
                        {info.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{info.description}</p>
                    <p className="text-xs font-medium text-green-600">
                      -{info.discount}% sur les commissions
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-8">
          {/* Upload section */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Ajouter un document
            </h2>
            <DocumentUploader
              onUploadSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['certification'] });
              }}
            />
          </div>

          {/* Uploaded documents */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Documents soumis
            </h2>

            {certification?.documents && certification.documents.length > 0 ? (
              <div className="space-y-4">
                {certification.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-4"
                  >
                    <div className="flex items-center">
                      <div className="rounded-lg bg-gray-100 p-3">
                        <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">
                          {doc.type_document === 'CNI' ? "Carte d'identité" : 'Titre foncier'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Soumis le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          doc.statut_verification === 'APPROUVE'
                            ? 'bg-green-100 text-green-700'
                            : doc.statut_verification === 'REJETE'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {doc.statut_verification === 'APPROUVE'
                          ? 'Approuvé'
                          : doc.statut_verification === 'REJETE'
                          ? 'Rejeté'
                          : 'En attente'}
                      </span>
                      <a
                        href={doc.fichier_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Voir
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-gray-500">Aucun document soumis</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
