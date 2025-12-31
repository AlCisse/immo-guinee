'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import SignatureModal from '@/components/contracts/SignatureModal';
import RetractionCountdown from '@/components/contracts/RetractionCountdown';
import PDFPreview from '@/components/contracts/PDFPreview';
import ContractClausesModal from '@/components/contracts/ContractClausesModal';

interface Contract {
  id: string;
  reference: string;
  numero_contrat: string;
  type_contrat: string;
  statut: string;
  loyer_mensuel: number;
  date_debut: string;
  date_fin: string;
  fichier_pdf_url: string;
  pdf_url: string;
  bailleur_signed_at: string | null;
  locataire_signed_at: string | null;
  delai_retractation_expire: string | null;
  bailleur_id: string;
  locataire_id: string | null;
  proprietaire: {
    id: string;
    nom_complet: string;
    telephone: string;
  } | null;
  locataire: {
    id: string;
    nom_complet: string;
    telephone: string;
  } | null;
  listing: {
    id: string;
    titre: string;
    quartier: string;
    photos: string[];
  } | null;
  bailleur_signature_data?: string;
  locataire_signature_data?: string;
}

// Fetch contract details
async function fetchContract(id: string): Promise<Contract> {
  const response = await apiClient.get(`/contracts/${id}`);
  return response.data.data.contract;
}

// Request signature OTP
async function requestSignatureOtp(contractId: string): Promise<{ expires_in: number }> {
  const response = await apiClient.post(`/contracts/${contractId}/sign/request-otp`);
  return response.data.data;
}

// Sign contract with OTP
async function signContract(contractId: string, otp: string) {
  const response = await apiClient.post(`/contracts/${contractId}/sign`, { otp });
  return response.data;
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

export default function ContractSignaturePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const contractId = params.id as string;

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showClausesModal, setShowClausesModal] = useState(false);
  const [userRole, setUserRole] = useState<'proprietaire' | 'locataire' | null>(null);
  const [hasUserSigned, setHasUserSigned] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch contract data
  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => fetchContract(contractId),
  });

  // Request OTP mutation
  const requestOtpMutation = useMutation({
    mutationFn: () => requestSignatureOtp(contractId),
  });

  // Sign contract mutation
  const signMutation = useMutation({
    mutationFn: (otp: string) => signContract(contractId, otp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      setShowSignatureModal(false);
    },
  });

  // Determine user's role and signature status
  useEffect(() => {
    if (contract) {
      // Get current user ID from stored user object
      let currentUserId: string | null = null;
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          currentUserId = user.id || null;
        }
      } catch {
        currentUserId = null;
      }

      // Check both proprietaire and bailleur_id (API uses both)
      const proprietaireId = contract.proprietaire?.id || contract.bailleur_id;
      const locataireId = contract.locataire?.id || contract.locataire_id;

      if (proprietaireId === currentUserId) {
        setUserRole('proprietaire');
        setHasUserSigned(!!contract.bailleur_signed_at);
      } else if (locataireId && locataireId === currentUserId) {
        setUserRole('locataire');
        setHasUserSigned(!!contract.locataire_signed_at);
      }
    }
  }, [contract]);

  const handleRequestOtp = async () => {
    await requestOtpMutation.mutateAsync();
    setShowSignatureModal(true);
  };

  const handleSign = async (otp: string) => {
    await signMutation.mutateAsync(otp);
  };

  const isBothSigned =
    contract?.bailleur_signed_at && contract?.locataire_signed_at && contract?.locataire;

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      BAIL_LOCATION_RESIDENTIEL: 'Bail de location résidentiel',
      BAIL_LOCATION_COMMERCIAL: 'Bail de location commercial',
      PROMESSE_VENTE_TERRAIN: 'Promesse de vente de terrain',
      MANDAT_GESTION: 'Mandat de gestion',
      ATTESTATION_CAUTION: 'Attestation de caution',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Contrat introuvable</h1>
        <p className="mt-2 text-gray-600">
          Le contrat demandé n&apos;existe pas ou vous n&apos;avez pas accès.
        </p>
        <div className="mt-8">
          <Link href="/dashboard/mes-contrats">
            <Button variant="primary">Retour à mes contrats</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/mes-contrats"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour à mes contrats
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Signer le contrat</h1>
        <p className="mt-2 text-gray-600">
          Référence: <span className="font-medium">{contract.reference}</span>
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract summary */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Détails du contrat
            </h2>

            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Type de contrat</dt>
                <dd className="font-medium text-gray-900">
                  {getContractTypeLabel(contract.type_contrat)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Bien concerné</dt>
                <dd className="font-medium text-gray-900">
                  {contract.listing?.titre || 'N/A'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Quartier</dt>
                <dd className="font-medium text-gray-900">
                  {contract.listing?.quartier || 'N/A'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Loyer mensuel</dt>
                <dd className="font-medium text-primary-600">
                  {contract.loyer_mensuel?.toLocaleString('fr-GN')} GNF
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Période</dt>
                <dd className="font-medium text-gray-900">
                  {new Date(contract.date_debut).toLocaleDateString('fr-FR')} -{' '}
                  {new Date(contract.date_fin).toLocaleDateString('fr-FR')}
                </dd>
              </div>
            </dl>
          </div>

          {/* PDF Preview */}
          {contract.fichier_pdf_url && (
            <PDFPreview
              url={contract.fichier_pdf_url}
              title="Aperçu du contrat"
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Signature status */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Statut des signatures
            </h3>

            <div className="space-y-4">
              {/* Proprietaire signature */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {contract.bailleur_signed_at ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                      <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">Propriétaire</p>
                    <p className="text-sm text-gray-500">{contract.proprietaire?.nom_complet || 'Non défini'}</p>
                  </div>
                </div>
                {contract.bailleur_signed_at && (
                  <span className="text-sm text-green-600">Signé</span>
                )}
              </div>

              {/* Locataire signature */}
              {contract.locataire ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {contract.locataire_signed_at ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Locataire</p>
                      <p className="text-sm text-gray-500">{contract.locataire.nom_complet}</p>
                    </div>
                  </div>
                  {contract.locataire_signed_at && (
                    <span className="text-sm text-green-600">Signé</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                      <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Locataire</p>
                      <p className="text-sm text-yellow-600">En attente d&apos;assignation</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Retraction countdown (if both signed) */}
          {isBothSigned && contract.delai_retractation_expire && (
            <RetractionCountdown
              expiresAt={contract.delai_retractation_expire}
              contractId={contract.id}
            />
          )}

          {/* View clauses button */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Clauses du contrat
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Consultez l&apos;ensemble des clauses et articles du contrat avant de signer.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowClausesModal(true)}
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Voir les clauses et articles
            </Button>
          </div>

          {/* Sign button */}
          {!hasUserSigned && userRole && contract.locataire && (
            <div className="rounded-lg border border-primary-200 bg-primary-50 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Prêt à signer ?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                En signant ce contrat, vous acceptez les conditions décrites dans le document.
                Un code OTP sera envoyé à votre téléphone pour valider votre signature.
              </p>
              <Button
                variant="primary"
                className="w-full"
                onClick={handleRequestOtp}
                isLoading={requestOtpMutation.isPending}
              >
                Signer le contrat
              </Button>
            </div>
          )}

          {/* No locataire assigned - Draft contract */}
          {!contract.locataire && userRole === 'proprietaire' && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Contrat en brouillon
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Ce contrat n&apos;a pas encore de locataire assigné.
                Vous devez d&apos;abord assigner un locataire avant de pouvoir procéder à la signature.
              </p>
              <Link href={`/contrats/generer?contract=${contract.id}`}>
                <Button variant="outline" className="w-full">
                  Modifier le contrat
                </Button>
              </Link>
            </div>
          )}

          {/* Already signed message */}
          {hasUserSigned && contract.locataire && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-6">
              <div className="flex items-center">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="ml-2 text-lg font-semibold text-green-800">
                  Vous avez signé
                </h3>
              </div>
              <p className="mt-2 text-sm text-green-700">
                Votre signature a été enregistrée. {!isBothSigned && "En attente de l'autre partie."}
              </p>
            </div>
          )}

          {/* Both signed - download available */}
          {isBothSigned && (
            <div className="space-y-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={async () => {
                  setIsDownloading(true);
                  await downloadContract(contract.id, contract.reference || contract.numero_contrat);
                  setIsDownloading(false);
                }}
                isLoading={isDownloading}
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Télécharger le contrat signé
              </Button>
            </div>
          )}

          {/* Legal notice */}
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> La signature électronique est conforme à la Loi L/2016/037/AN.
              Une fois signé par les deux parties, le contrat est archivé de manière sécurisée pendant 10 ans.
            </p>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSubmit={handleSign}
        isLoading={signMutation.isPending}
        error={signMutation.error?.message}
        contractReference={contract.reference}
        otpExpiresIn={requestOtpMutation.data?.expires_in}
      />

      {/* Contract Clauses Modal */}
      <ContractClausesModal
        isOpen={showClausesModal}
        onClose={() => setShowClausesModal(false)}
        contractType={contract.type_contrat}
      />
    </div>
  );
}
