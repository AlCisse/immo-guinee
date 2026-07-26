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
    color: 'text-warning-600',
    bgColor: 'bg-warning-50',
    borderColor: 'border-warning-200',
    description: 'Niveau de base pour les nouveaux utilisateurs',
    discount: 0,
  },
  ARGENT: {
    label: 'Argent',
    color: 'text-neutral-500 dark:text-neutral-400',
    bgColor: 'bg-neutral-50 dark:bg-dark-bg',
    borderColor: 'border-neutral-300 dark:border-dark-border',
    description: 'CNI vérifiée, 1+ transaction, note 3.5+',
    discount: 5,
  },
  OR: {
    label: 'Or',
    color: 'text-warning-600',
    bgColor: 'bg-warning-50',
    borderColor: 'border-warning-300',
    description: 'CNI vérifiée, 5+ transactions, note 4.0+',
    discount: 10,
  },
  DIAMANT: {
    label: 'Diamant',
    color: 'text-secondary-600',
    bgColor: 'bg-secondary-50',
    borderColor: 'border-secondary-300',
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
        <div className="rounded-lg border border-error-200 bg-error-50 p-6 text-center">
          <p className="text-error-700">Erreur lors du chargement de la certification</p>
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
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Programme de Certification</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
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
      <div className="mb-6 border-b border-neutral-200 dark:border-dark-border">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:border-dark-border hover:text-neutral-700 dark:text-neutral-300'
            }`}
          >
            Vue d&apos;ensemble
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === 'documents'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:border-dark-border hover:text-neutral-700 dark:text-neutral-300'
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
            <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
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
            <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-6">
              <div className="flex items-center">
                <svg className="h-8 w-8 text-secondary-600 mr-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-semibold text-secondary-800">Niveau maximum atteint !</h3>
                  <p className="text-secondary-600">
                    Vous avez atteint le niveau Diamant, le plus haut niveau de certification.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid gap-6 md:grid-cols-4">
            <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Transactions</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {certification?.stats?.nombre_transactions || 0}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Note moyenne</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {certification?.stats?.note_moyenne?.toFixed(1) || '0.0'}
                </p>
                <span className="ml-1 text-warning-500">&#9733;</span>
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Litiges</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {certification?.stats?.nombre_litiges || 0}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Vérification</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-white mt-1">
                {certification?.stats?.statut_verification === 'TITRE_FONCIER_VERIFIE'
                  ? 'Titre foncier vérifié'
                  : certification?.stats?.statut_verification === 'CNI_VERIFIEE'
                  ? 'CNI vérifiée'
                  : 'Non vérifié'}
              </p>
            </div>
          </div>

          {/* All badge levels */}
          <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Tous les niveaux</h2>
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
                        ? 'border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card'
                        : 'border-neutral-100 dark:border-dark-border bg-neutral-50 dark:bg-dark-bg opacity-60'
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
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">{info.description}</p>
                    <p className="text-xs font-medium text-success-600">
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
          <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Ajouter un document
            </h2>
            <DocumentUploader
              onUploadSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['certification'] });
              }}
            />
          </div>

          {/* Uploaded documents */}
          <div className="rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Documents soumis
            </h2>

            {certification?.documents && certification.documents.length > 0 ? (
              <div className="space-y-4">
                {certification.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-100 dark:border-dark-border p-4"
                  >
                    <div className="flex items-center">
                      <div className="rounded-lg bg-neutral-100 dark:bg-dark-hover p-3">
                        <svg className="h-6 w-6 text-neutral-500 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {doc.type_document === 'CNI' ? "Carte d'identité" : 'Titre foncier'}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Soumis le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          doc.statut_verification === 'APPROUVE'
                            ? 'bg-success-100 text-success-700'
                            : doc.statut_verification === 'REJETE'
                            ? 'bg-error-100 text-error-700'
                            : 'bg-warning-100 text-warning-700'
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
                <svg className="mx-auto h-12 w-12 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-neutral-500 dark:text-neutral-400">Aucun document soumis</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
