'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';

interface Contract {
  id: string;
  reference?: string;
  numero_contrat?: string;
  type_contrat?: string;
  statut: string;
  loyer_mensuel?: number;
  date_debut: string;
  date_fin?: string;
  fichier_pdf_url?: string;
  pdf_url?: string;
  // Signature fields - API uses bailleur_signed_at and locataire_signed_at
  date_signature_proprietaire?: string | null;
  date_signature_locataire?: string | null;
  bailleur_signed_at?: string | null;
  locataire_signed_at?: string | null;
  delai_retractation_expire?: string | null;
  created_at: string;
  bailleur_id?: string;
  locataire_id?: string;
  // Termination fields
  resiliation_requested_at?: string | null;
  resiliation_requested_by?: string | null;
  resiliation_motif?: string | null;
  resiliation_effective_date?: string | null;
  preavis_months?: number;
  resiliation_confirmed_at?: string | null;
  resiliation_confirmed_by?: string | null;
  proprietaire?: {
    id: string;
    nom_complet: string;
  };
  locataire?: {
    id: string;
    nom_complet: string;
  };
  listing?: {
    id: string;
    titre: string;
    quartier: string;
    commune?: string;
    photos?: string[];
    photo_principale?: string;
    main_photo_url?: string;
  };
}

interface ContractsResponse {
  contracts: Contract[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// Download contract PDF with authentication
async function downloadContract(contractId: string, reference: string) {
  try {
    const response = await apiClient.get(`/contracts/${contractId}/download`, {
      responseType: 'blob',
    });

    // Create blob URL and trigger download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contrat_${reference}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading contract:', error);
    alert('Erreur lors du téléchargement du contrat');
  }
}

// Fetch user contracts
async function fetchMyContracts(
  page: number = 1,
  status?: string,
  role?: string
): Promise<ContractsResponse> {
  const params: Record<string, string> = { page: page.toString() };
  if (status) params.statut = status;
  if (role) params.role = role;

  console.log('[Contracts] Fetching contracts with params:', params);
  const response = await api.contracts.my(params);
  console.log('[Contracts] Raw API response:', response);
  console.log('[Contracts] response.data:', response.data);

  const data = response.data.data || response.data;
  console.log('[Contracts] Parsed data:', data);
  console.log('[Contracts] Contracts array:', data.contracts);

  // Handle both paginated and non-paginated responses
  const result = {
    contracts: data.contracts || [],
    pagination: data.pagination || {
      current_page: 1,
      last_page: 1,
      per_page: 20,
      total: (data.contracts || []).length,
    },
  };
  console.log('[Contracts] Final result:', result);
  return result;
}

// Contract status badge
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    BROUILLON: {
      label: 'Brouillon',
      className: 'bg-gray-100 text-gray-700',
    },
    EN_ATTENTE_SIGNATURE: {
      label: 'En attente',
      className: 'bg-yellow-100 text-yellow-700',
    },
    EN_ATTENTE_SIGNATURE_LOCATAIRE: {
      label: 'En attente du locataire',
      className: 'bg-yellow-100 text-yellow-700',
    },
    PARTIELLEMENT_SIGNE: {
      label: 'Signature partielle',
      className: 'bg-orange-100 text-orange-700',
    },
    SIGNE: {
      label: 'Signé',
      className: 'bg-blue-100 text-blue-700',
    },
    EN_RETRACTATION: {
      label: 'En rétractation',
      className: 'bg-purple-100 text-purple-700',
    },
    ACTIF: {
      label: 'Actif',
      className: 'bg-green-100 text-green-700',
    },
    EN_PREAVIS: {
      label: 'En préavis',
      className: 'bg-orange-100 text-orange-700',
    },
    EXPIRE: {
      label: 'Expiré',
      className: 'bg-gray-100 text-gray-600',
    },
    ANNULE: {
      label: 'Annulé',
      className: 'bg-red-100 text-red-700',
    },
    RESILIE: {
      label: 'Résilié',
      className: 'bg-red-100 text-red-700',
    },
  };

  const { label, className } = config[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-700',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// Contract type label
function getContractTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    BAIL_LOCATION_RESIDENTIEL: 'Bail résidentiel',
    BAIL_LOCATION_COMMERCIAL: 'Bail commercial',
    PROMESSE_VENTE_TERRAIN: 'Promesse de vente',
    MANDAT_GESTION: 'Mandat de gestion',
    ATTESTATION_CAUTION: 'Attestation caution',
  };
  return labels[type] || type;
}

// Contract card component
function ContractCard({
  contract,
  currentUserId,
  onCancel,
  isCancelling,
  onTerminate,
  isTerminating,
}: {
  contract: Contract;
  currentUserId: string | null;
  onCancel: (contractId: string) => void;
  isCancelling: boolean;
  onTerminate: (contractId: string) => void;
  isTerminating: boolean;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  // Handle both cases: when relations are loaded or when we only have IDs
  const proprietaireId = contract.proprietaire?.id || contract.bailleur_id;
  const tenantId = contract.locataire?.id || contract.locataire_id;

  const isProprietaire = proprietaireId === currentUserId;
  const isLocataire = tenantId === currentUserId;
  const userRole = isProprietaire ? 'Propriétaire' : 'Locataire';
  const otherParty = isProprietaire ? contract.locataire : contract.proprietaire;
  const otherPartyName = otherParty?.nom_complet || 'Autre partie';

  // Handle both API field names: date_signature_* and *_signed_at
  const proprietaireSigned = contract.date_signature_proprietaire || contract.bailleur_signed_at;
  const locataireSigned = contract.date_signature_locataire || contract.locataire_signed_at;

  const hasUserSigned = isProprietaire
    ? !!proprietaireSigned
    : !!locataireSigned;

  const isBothSigned = proprietaireSigned && locataireSigned;
  const needsAction = !hasUserSigned &&
    contract.statut !== 'BROUILLON' &&
    contract.statut !== 'ANNULE' &&
    contract.statut !== 'RESILIE';

  // Both owner and tenant can cancel if contract is not fully signed
  // Owner can always cancel unsigned contracts
  // Tenant can cancel if they haven't signed yet
  const canCancel = !isBothSigned &&
    contract.statut !== 'ANNULE' &&
    contract.statut !== 'RESILIE' &&
    contract.statut !== 'ACTIF' &&
    (isProprietaire || (isLocataire && !locataireSigned));

  // Termination logic
  const canTerminate = (contract.statut === 'ACTIF' || contract.statut === 'SIGNE') &&
    !contract.resiliation_requested_at;

  const isInTerminationPeriod = contract.statut === 'EN_PREAVIS' ||
    (contract.resiliation_requested_at && contract.resiliation_effective_date);

  const terminationRequestedByMe = contract.resiliation_requested_by === currentUserId;
  const canConfirmTermination = isInTerminationPeriod &&
    !terminationRequestedByMe &&
    !contract.resiliation_confirmed_at;

  // Calculate days until termination
  const daysUntilTermination = contract.resiliation_effective_date
    ? Math.ceil((new Date(contract.resiliation_effective_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">{contract.reference || contract.numero_contrat || contract.id.slice(0, 8)}</h3>
              <StatusBadge status={contract.statut} />
            </div>
            <p className="text-sm text-gray-500">{getContractTypeLabel(contract.type_contrat || 'location')}</p>
          </div>
          {needsAction && (
            <span className="flex h-3 w-3">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              </span>
            </span>
          )}
        </div>

        {/* Property info */}
        <div className="flex gap-4 mb-4">
          {(contract.listing?.photos?.[0] || contract.listing?.photo_principale || contract.listing?.main_photo_url) && (
            <img
              src={contract.listing.photos?.[0] || contract.listing.photo_principale || contract.listing.main_photo_url}
              alt={contract.listing.titre}
              className="h-16 w-20 rounded-md object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{contract.listing?.titre || 'Bien immobilier'}</p>
            <p className="text-sm text-gray-500">{contract.listing?.quartier}</p>
            <p className="text-sm font-semibold text-primary-600">
              {contract.loyer_mensuel?.toLocaleString('fr-GN')} GNF/mois
            </p>
          </div>
        </div>

        {/* Parties info */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-gray-500">Votre rôle</p>
            <p className="font-medium text-gray-900">{userRole}</p>
          </div>
          <div>
            <p className="text-gray-500">Autre partie</p>
            <p className="font-medium text-gray-900">{otherPartyName}</p>
          </div>
        </div>

        {/* Signature status */}
        <div className="border-t border-gray-100 pt-4 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {proprietaireSigned ? (
                <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              )}
              <span className={proprietaireSigned ? 'text-green-700' : 'text-gray-500'}>
                Propriétaire
              </span>
            </div>
            <div className="flex items-center gap-2">
              {locataireSigned ? (
                <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              )}
              <span className={locataireSigned ? 'text-green-700' : 'text-gray-500'}>
                Locataire
              </span>
            </div>
          </div>
        </div>

        {/* Retraction warning */}
        {isBothSigned && contract.delai_retractation_expire && new Date(contract.delai_retractation_expire) > new Date() && (
          <div className="mb-4 rounded-md bg-yellow-50 p-3">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-yellow-700">
                Rétractation possible jusqu&apos;au {new Date(contract.delai_retractation_expire).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        )}

        {/* Termination notice */}
        {isInTerminationPeriod && daysUntilTermination !== null && daysUntilTermination > 0 && (
          <div className="mb-4 rounded-md bg-orange-50 border border-orange-200 p-3">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">
                  Résiliation en cours
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Date effective : {new Date(contract.resiliation_effective_date!).toLocaleDateString('fr-FR')}
                  {' '}({daysUntilTermination} jour{daysUntilTermination > 1 ? 's' : ''} restant{daysUntilTermination > 1 ? 's' : ''})
                </p>
                {contract.resiliation_motif && (
                  <p className="text-xs text-orange-600 mt-1">
                    Motif : {contract.resiliation_motif}
                  </p>
                )}
                {!contract.resiliation_confirmed_at && (
                  <p className="text-xs text-orange-600 mt-1 italic">
                    {terminationRequestedByMe
                      ? "En attente de confirmation de l'autre partie"
                      : 'En attente de votre confirmation'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {needsAction ? (
            <Link href={`/contrats/${contract.id}`} className="flex-1">
              <Button variant="primary" className="w-full">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Voir et signer
              </Button>
            </Link>
          ) : (
            <Link href={`/contrats/${contract.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                Voir les détails
              </Button>
            </Link>
          )}
          {isBothSigned && (
            <Button
              variant="outline"
              onClick={async () => {
                setIsDownloading(true);
                await downloadContract(contract.id, contract.reference || contract.numero_contrat || contract.id);
                setIsDownloading(false);
              }}
              disabled={isDownloading}
              aria-label="Télécharger"
            >
              {isDownloading ? (
                <Spinner size="sm" />
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              onClick={() => onCancel(contract.id)}
              disabled={isCancelling}
              className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
              aria-label="Annuler le contrat"
            >
              {isCancelling ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Annuler
                </>
              )}
            </Button>
          )}
          {canTerminate && (
            <Button
              variant="outline"
              onClick={() => onTerminate(contract.id)}
              disabled={isTerminating}
              className="text-orange-600 border-orange-300 hover:bg-orange-50 hover:border-orange-400"
              aria-label="Résilier le contrat"
            >
              {isTerminating ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Résilier
                </>
              )}
            </Button>
          )}
          {canConfirmTermination && (
            <Button
              variant="outline"
              onClick={() => onTerminate(contract.id)}
              disabled={isTerminating}
              className="text-green-600 border-green-300 hover:bg-green-50 hover:border-green-400"
              aria-label="Confirmer la résiliation"
            >
              {isTerminating ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Confirmer
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Filter tabs
const FILTER_TABS = [
  { key: 'all', label: 'Tous' },
  { key: 'pending', label: 'En attente', statuses: ['EN_ATTENTE_SIGNATURE', 'PARTIELLEMENT_SIGNE'] },
  { key: 'active', label: 'Actifs', statuses: ['ACTIF', 'SIGNE'] },
  { key: 'completed', label: 'Terminés', statuses: ['EXPIRE', 'ANNULE', 'RESILIE'] },
];

// Cancel contract API
async function cancelContract(id: string): Promise<{ deleted: boolean }> {
  const response = await apiClient.post(`/contracts/${id}/cancel`);
  return response.data.data;
}

// Terminate contract API (request termination with notice period)
async function terminateContract(id: string, motif: string): Promise<Contract> {
  const response = await apiClient.post(`/contracts/${id}/terminate`, { motif });
  return response.data.data?.contract || response.data.contract;
}

// Confirm termination API
async function confirmTermination(id: string): Promise<Contract> {
  const response = await apiClient.post(`/contracts/${id}/terminate/confirm`);
  return response.data.data?.contract || response.data.contract;
}

export default function MyContractsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [contractToCancel, setContractToCancel] = useState<string | null>(null);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [contractToTerminate, setContractToTerminate] = useState<string | null>(null);
  const [terminationMotif, setTerminationMotif] = useState('');
  const [isConfirmingTermination, setIsConfirmingTermination] = useState(false);

  // Show success toast if redirected from contract creation
  useEffect(() => {
    const success = searchParams.get('success');
    const highlightId = searchParams.get('highlight');

    if (success === 'created') {
      toast.success('Contrat créé avec succès ! Le locataire a été notifié.');
      // Clean up URL params
      router.replace('/dashboard/mes-contrats', { scroll: false });
    }
  }, [searchParams, router]);

  // Get current user ID from stored user object
  const currentUserId = typeof window !== 'undefined'
    ? (() => {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            return user.id || null;
          }
          return null;
        } catch {
          return null;
        }
      })()
    : null;

  // Get status filter based on active tab
  const statusFilter = FILTER_TABS.find(t => t.key === activeTab)?.statuses?.join(',');

  // Fetch contracts
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-contracts', currentPage, statusFilter, roleFilter],
    queryFn: () => fetchMyContracts(currentPage, statusFilter, roleFilter),
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: cancelContract,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['my-contracts'] });
      setShowCancelModal(false);
      setContractToCancel(null);
    },
  });

  // Terminate mutation
  const terminateMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) => terminateContract(id, motif),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-contracts'] });
      setShowTerminateModal(false);
      setContractToTerminate(null);
      setTerminationMotif('');
      toast.success('Demande de résiliation envoyée avec préavis de 3 mois');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la demande de résiliation');
    },
  });

  // Confirm termination mutation
  const confirmTerminationMutation = useMutation({
    mutationFn: confirmTermination,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-contracts'] });
      toast.success('Résiliation confirmée');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la confirmation');
    },
  });

  const handleCancelClick = (contractId: string) => {
    setContractToCancel(contractId);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    if (contractToCancel) {
      cancelMutation.mutate(contractToCancel);
    }
  };

  const handleTerminateClick = (contractId: string) => {
    // Check if contract has pending termination that needs confirmation
    const contract = contracts.find(c => c.id === contractId);
    if (contract?.resiliation_requested_at && contract.resiliation_requested_by !== currentUserId && !contract.resiliation_confirmed_at) {
      // This is a confirmation action
      setIsConfirmingTermination(true);
      setContractToTerminate(contractId);
      setShowTerminateModal(true);
    } else {
      // This is a new termination request
      setIsConfirmingTermination(false);
      setContractToTerminate(contractId);
      setShowTerminateModal(true);
    }
  };

  const handleConfirmTerminate = () => {
    if (contractToTerminate) {
      if (isConfirmingTermination) {
        confirmTerminationMutation.mutate(contractToTerminate);
        setShowTerminateModal(false);
        setContractToTerminate(null);
      } else {
        terminateMutation.mutate({ id: contractToTerminate, motif: terminationMotif });
      }
    }
  };

  const contracts = data?.contracts || [];
  const pagination = data?.pagination;

  // Count contracts needing action
  const pendingCount = contracts.filter(c => {
    const propId = c.proprietaire?.id || c.bailleur_id;
    const locId = c.locataire?.id || c.locataire_id;
    const propSigned = c.date_signature_proprietaire || c.bailleur_signed_at;
    const locSigned = c.date_signature_locataire || c.locataire_signed_at;
    return (c.statut === 'EN_ATTENTE_SIGNATURE' || c.statut === 'PARTIELLEMENT_SIGNE' || c.statut === 'EN_ATTENTE_SIGNATURE_LOCATAIRE') &&
      ((propId === currentUserId && !propSigned) ||
       (locId === currentUserId && !locSigned));
  }).length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes contrats</h1>
            <p className="mt-1 text-gray-600">
              Gérez tous vos contrats de location et de vente
            </p>
          </div>
          <Link href="/contrats/generer">
            <Button variant="primary">
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nouveau contrat
            </Button>
          </Link>
        </div>

        {/* Pending action banner */}
        {pendingCount > 0 && (
          <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-yellow-700">
                <strong>{pendingCount} contrat{pendingCount > 1 ? 's' : ''}</strong> en attente de votre signature
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Status tabs */}
        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Role filter */}
        <select
          value={roleFilter || ''}
          onChange={(e) => {
            setRoleFilter(e.target.value || undefined);
            setCurrentPage(1);
          }}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
          aria-label="Filtrer par rôle"
        >
          <option value="">Tous les rôles</option>
          <option value="proprietaire">En tant que propriétaire</option>
          <option value="locataire">En tant que locataire</option>
        </select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-red-800">Erreur de chargement</h3>
          <p className="mt-2 text-sm text-red-600">
            Impossible de charger vos contrats. Veuillez réessayer.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && contracts.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun contrat</h3>
          <p className="mt-2 text-gray-500">
            {activeTab === 'all'
              ? "Vous n'avez pas encore de contrats. Parcourez les annonces pour créer votre premier contrat."
              : 'Aucun contrat ne correspond à ce filtre.'}
          </p>
          {activeTab === 'all' && (
            <div className="mt-6">
              <Link href="/contrats/generer">
                <Button variant="primary">Créer un contrat</Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Contracts grid */}
      {!isLoading && !error && contracts.length > 0 && (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {contracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                currentUserId={currentUserId}
                onCancel={handleCancelClick}
                isCancelling={cancelMutation.isPending && contractToCancel === contract.id}
                onTerminate={handleTerminateClick}
                isTerminating={(terminateMutation.isPending || confirmTerminationMutation.isPending) && contractToTerminate === contract.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.last_page > 1 && (
            <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-600">
                Page {pagination.current_page} sur {pagination.last_page} ({pagination.total} contrats)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={pagination.current_page === 1}
                  onClick={() => setCurrentPage(pagination.current_page - 1)}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  disabled={pagination.current_page === pagination.last_page}
                  onClick={() => setCurrentPage(pagination.current_page + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Cancel confirmation modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setContractToCancel(null);
        }}
        title="Annuler le contrat"
        size="sm"
      >
        <div className="flex items-center justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <p className="text-center text-gray-700 mb-2">
          Êtes-vous sûr de vouloir annuler ce contrat ?
        </p>
        <p className="text-center text-sm text-gray-500 mb-6">
          Cette action est irréversible. Le contrat sera définitivement supprimé.
        </p>

        {cancelMutation.isError && (
          <div className="mb-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-700">
              {(cancelMutation.error as any)?.response?.data?.message || 'Une erreur est survenue'}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setShowCancelModal(false);
              setContractToCancel(null);
            }}
            disabled={cancelMutation.isPending}
          >
            Non, garder
          </Button>
          <Button
            variant="primary"
            className="flex-1 bg-red-600 hover:bg-red-700"
            onClick={handleConfirmCancel}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Annulation...
              </>
            ) : (
              'Oui, annuler'
            )}
          </Button>
        </div>
      </Modal>

      {/* Termination modal */}
      <Modal
        isOpen={showTerminateModal}
        onClose={() => {
          setShowTerminateModal(false);
          setContractToTerminate(null);
          setTerminationMotif('');
        }}
        title={isConfirmingTermination ? "Confirmer la résiliation" : "Résilier le contrat"}
        size="sm"
      >
        <div className="flex items-center justify-center mb-4">
          <div className={`h-12 w-12 rounded-full ${isConfirmingTermination ? 'bg-green-100' : 'bg-orange-100'} flex items-center justify-center`}>
            {isConfirmingTermination ? (
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            )}
          </div>
        </div>

        {isConfirmingTermination ? (
          <>
            <p className="text-center text-gray-700 mb-2">
              L&apos;autre partie a demandé la résiliation de ce contrat.
            </p>
            <p className="text-center text-sm text-gray-500 mb-6">
              En confirmant, vous acceptez la résiliation avec le préavis de 3 mois défini.
            </p>
          </>
        ) : (
          <>
            <p className="text-center text-gray-700 mb-2">
              Demander la résiliation du contrat ?
            </p>
            <p className="text-center text-sm text-gray-500 mb-4">
              Un préavis de <strong>3 mois</strong> sera appliqué. L&apos;autre partie sera notifiée et devra confirmer.
            </p>

            <div className="mb-6">
              <label htmlFor="motif" className="block text-sm font-medium text-gray-700 mb-1">
                Motif de résiliation (facultatif)
              </label>
              <textarea
                id="motif"
                value={terminationMotif}
                onChange={(e) => setTerminationMotif(e.target.value)}
                placeholder="Ex: Déménagement, fin de location..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                rows={3}
              />
            </div>
          </>
        )}

        {(terminateMutation.isError || confirmTerminationMutation.isError) && (
          <div className="mb-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-700">
              {(terminateMutation.error as any)?.response?.data?.message ||
               (confirmTerminationMutation.error as any)?.response?.data?.message ||
               'Une erreur est survenue'}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setShowTerminateModal(false);
              setContractToTerminate(null);
              setTerminationMotif('');
            }}
            disabled={terminateMutation.isPending || confirmTerminationMutation.isPending}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            className={`flex-1 ${isConfirmingTermination ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}
            onClick={handleConfirmTerminate}
            disabled={terminateMutation.isPending || confirmTerminationMutation.isPending}
          >
            {(terminateMutation.isPending || confirmTerminationMutation.isPending) ? (
              <>
                <Spinner size="sm" className="mr-2" />
                {isConfirmingTermination ? 'Confirmation...' : 'Envoi...'}
              </>
            ) : (
              isConfirmingTermination ? 'Confirmer' : 'Demander la résiliation'
            )}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
