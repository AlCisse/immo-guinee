'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FileText, Check, Clock, Loader2, Phone, Shield, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://immoguinee.com/api';

interface Contract {
  id: string;
  reference?: string;
  numero_contrat?: string;
  loyer_mensuel: number;
  date_debut: string;
  date_fin: string;
  bailleur_signed_at: string | null;
  locataire_signed_at: string | null;
  bailleur?: {
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
  };
}

interface ContractResponse {
  success: boolean;
  data: {
    contract: Contract;
    can_sign: boolean;
    expires_at: string;
  };
  message?: string;
}

// Fetch contract by token
async function fetchContractByToken(token: string): Promise<ContractResponse> {
  const response = await axios.get(`${API_URL}/contracts/sign/${token}`);
  return response.data;
}

// Request OTP
async function requestOtp(token: string): Promise<{ phone_masked: string }> {
  const response = await axios.post(`${API_URL}/contracts/sign/${token}/request-otp`);
  return response.data.data;
}

// Sign contract
async function signContract(token: string, otp: string) {
  const response = await axios.post(`${API_URL}/contracts/sign/${token}`, { otp });
  return response.data;
}

const SIGN_STEPS = ['Détails', 'Vérification', 'Signature'];
function SignSteps({ current }: { current: 'view' | 'otp' | 'success' }) {
  const idx = current === 'view' ? 0 : current === 'otp' ? 1 : 2;
  return (
    <div className="flex items-center mb-8">
      {SIGN_STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
              i < idx ? 'bg-success-500 text-white' : i === idx ? 'bg-primary-500 text-white' : 'bg-neutral-200 dark:bg-dark-hover text-neutral-500 dark:text-neutral-400'
            }`}>
              {i < idx ? '✓' : i + 1}
            </span>
            <span className={`text-sm font-medium whitespace-nowrap ${i === idx ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>{label}</span>
          </div>
          {i < SIGN_STEPS.length - 1 && (
            <div className={`flex-1 h-px mx-3 ${i < idx ? 'bg-success-500' : 'bg-neutral-200 dark:bg-dark-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function PublicContractSigningPage() {
  const params = useParams();
  const token = params.token as string;

  const [step, setStep] = useState<'view' | 'otp' | 'success'>('view');
  const [otp, setOtp] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');

  // Fetch contract
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contract-token', token],
    queryFn: () => fetchContractByToken(token),
    retry: false,
  });

  // Request OTP mutation
  const requestOtpMutation = useMutation({
    mutationFn: () => requestOtp(token),
    onSuccess: (data) => {
      setPhoneMasked(data.phone_masked);
      setStep('otp');
      toast.success('Code envoyé par WhatsApp');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'envoi du code');
    },
  });

  // Sign mutation
  const signMutation = useMutation({
    mutationFn: () => signContract(token, otp),
    onSuccess: (response) => {
      setStep('success');
      toast.success(response.message || 'Contrat signé avec succès !');
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Code incorrect');
    },
  });

  const contract = data?.data?.contract;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto" />
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">Chargement du contrat...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Lien invalide ou expiré';
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-dark-card rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-error-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Lien invalide</h1>
          <p className="text-neutral-600 dark:text-neutral-400">{errorMessage}</p>
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            Veuillez demander un nouveau lien de signature au propriétaire.
          </p>
        </div>
      </div>
    );
  }

  // Already signed
  if (contract?.locataire_signed_at) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-dark-card rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-success-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Contrat déjà signé</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Ce contrat a été signé le {new Date(contract.locataire_signed_at).toLocaleDateString('fr-FR')}.</p>
        </div>
      </div>
    );
  }

  // Success step
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-dark-card rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-success-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Contrat signé !</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Votre signature a été enregistrée avec succès.
            {!contract?.bailleur_signed_at && " En attente de la signature du propriétaire."}
          </p>
          <div className="mt-6 p-4 bg-neutral-50 dark:bg-dark-bg rounded-lg">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Un email de confirmation vous sera envoyé une fois que les deux parties auront signé.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // OTP step
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-dark-card rounded-2xl shadow-lg p-8">
          <SignSteps current="otp" />
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Vérification</h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Un code a été envoyé par WhatsApp au {phoneMasked}
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Code de vérification
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-2xl tracking-widest py-4 border border-neutral-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <button
              onClick={() => signMutation.mutate()}
              disabled={otp.length !== 6 || signMutation.isPending}
              className="w-full py-4 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {signMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signature en cours...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Signer le contrat
                </>
              )}
            </button>

            <button
              onClick={() => requestOtpMutation.mutate()}
              disabled={requestOtpMutation.isPending}
              className="w-full py-3 text-primary-600 font-medium hover:underline"
            >
              Renvoyer le code
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View step (default)
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <SignSteps current="view" />
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Contrat à signer</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">
            Référence: {contract?.reference || contract?.numero_contrat}
          </p>
        </div>

        {/* Contract details */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Détails du contrat</h2>

          <dl className="space-y-3">
            {contract?.listing && (
              <>
                <div className="flex justify-between py-2 border-b border-neutral-100 dark:border-dark-border">
                  <dt className="text-neutral-600 dark:text-neutral-400">Bien</dt>
                  <dd className="font-medium text-neutral-900 dark:text-white">{contract.listing.titre}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-100 dark:border-dark-border">
                  <dt className="text-neutral-600 dark:text-neutral-400">Quartier</dt>
                  <dd className="font-medium text-neutral-900 dark:text-white">{contract.listing.quartier}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between py-2 border-b border-neutral-100 dark:border-dark-border">
              <dt className="text-neutral-600 dark:text-neutral-400">Loyer mensuel</dt>
              <dd className="font-medium text-primary-600">
                {contract?.loyer_mensuel?.toLocaleString('fr-GN')} GNF
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-100 dark:border-dark-border">
              <dt className="text-neutral-600 dark:text-neutral-400">Période</dt>
              <dd className="font-medium text-neutral-900 dark:text-white">
                {contract?.date_debut && new Date(contract.date_debut).toLocaleDateString('fr-FR')} - {contract?.date_fin && new Date(contract.date_fin).toLocaleDateString('fr-FR')}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-100 dark:border-dark-border">
              <dt className="text-neutral-600 dark:text-neutral-400">Propriétaire</dt>
              <dd className="font-medium text-neutral-900 dark:text-white">{contract?.bailleur?.nom_complet}</dd>
            </div>
          </dl>
        </div>

        {/* Signature status */}
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Statut des signatures</h2>

          <div className="space-y-4">
            {/* Bailleur */}
            <div className="flex items-center gap-3">
              {contract?.bailleur_signed_at ? (
                <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-success-600" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-neutral-100 dark:bg-dark-hover rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-neutral-400" />
                </div>
              )}
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Propriétaire</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {contract?.bailleur_signed_at ? 'Signé' : 'En attente'}
                </p>
              </div>
            </div>

            {/* Locataire */}
            <div className="flex items-center gap-3">
              {contract?.locataire_signed_at ? (
                <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-success-600" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary-600" />
                </div>
              )}
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Locataire (vous)</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {contract?.locataire_signed_at ? 'Signé' : 'En attente de votre signature'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sign button */}
        <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            En cliquant sur &quot;Signer&quot;, vous acceptez les termes du contrat.
            Un code de vérification sera envoyé à votre téléphone par WhatsApp.
          </p>

          <button
            onClick={() => requestOtpMutation.mutate()}
            disabled={requestOtpMutation.isPending}
            className="w-full py-4 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {requestOtpMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Envoi du code...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Signer le contrat
              </>
            )}
          </button>
        </div>

        {/* Legal notice */}
        <p className="mt-6 text-xs text-center text-neutral-500 dark:text-neutral-400">
          Signature électronique conforme à la Loi L/2016/037/AN.
          Le contrat sera archivé de manière sécurisée pendant 10 ans.
        </p>
      </div>
    </div>
  );
}
