'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import {
  Insurance,
  useUserInsurances,
  useSubmitClaim,
  useCheckClaimEligibility,
  ClaimData,
  formatMoney,
  getTypeLabel,
  getStatusColor,
  getStatusLabel,
} from '@/lib/hooks/useInsurances';

// T228: Insurance claims page

type ClaimType = 'expulsion' | 'caution' | 'juridique' | 'impayes' | 'degats';

interface ClaimTypeOption {
  type: ClaimType;
  label: string;
  description: string;
  forInsurance: 'SEJOUR_SEREIN' | 'LOYER_GARANTI';
  icon: string;
}

const CLAIM_TYPES: ClaimTypeOption[] = [
  {
    type: 'expulsion',
    label: 'Expulsion abusive',
    description: 'Vous avez été expulsé sans motif légal valable',
    forInsurance: 'SEJOUR_SEREIN',
    icon: 'home',
  },
  {
    type: 'caution',
    label: 'Remboursement caution',
    description: 'Le propriétaire refuse de rembourser votre caution',
    forInsurance: 'SEJOUR_SEREIN',
    icon: 'wallet',
  },
  {
    type: 'juridique',
    label: 'Assistance juridique',
    description: 'Besoin d\'un accompagnement juridique pour un litige',
    forInsurance: 'SEJOUR_SEREIN',
    icon: 'scale',
  },
  {
    type: 'impayes',
    label: 'Loyers impayés',
    description: 'Le locataire n\'a pas payé ses loyers depuis 2 mois ou plus',
    forInsurance: 'LOYER_GARANTI',
    icon: 'banknotes',
  },
  {
    type: 'degats',
    label: 'Dégâts locatifs',
    description: 'Dommages causés par le locataire au logement',
    forInsurance: 'LOYER_GARANTI',
    icon: 'home-damage',
  },
];

type Step = 'select-insurance' | 'select-claim-type' | 'claim-form' | 'success';

export default function InsuranceClaimsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedInsuranceId = searchParams.get('assurance');

  const [step, setStep] = useState<Step>('select-insurance');
  const [selectedInsurance, setSelectedInsurance] = useState<Insurance | null>(null);
  const [selectedClaimType, setSelectedClaimType] = useState<ClaimType | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [proofs, setProofs] = useState<File[]>([]);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  const { data: insurances, isLoading } = useUserInsurances();
  const submitClaimMutation = useSubmitClaim(selectedInsurance?.id || '');
  const checkEligibilityMutation = useCheckClaimEligibility(selectedInsurance?.id || '');

  // Filter active insurances
  const activeInsurances = insurances?.filter((i) => i.statut === 'ACTIVE') || [];

  // Get available claim types for selected insurance
  const availableClaimTypes = selectedInsurance
    ? CLAIM_TYPES.filter((ct) => ct.forInsurance === selectedInsurance.type_assurance)
    : [];

  const handleInsuranceSelect = (insurance: Insurance) => {
    setSelectedInsurance(insurance);
    setStep('select-claim-type');
    setEligibilityError(null);
  };

  const handleClaimTypeSelect = async (claimType: ClaimType) => {
    if (!selectedInsurance) return;

    setEligibilityError(null);

    try {
      const result = await checkEligibilityMutation.mutateAsync(claimType);
      if (!result.eligible) {
        setEligibilityError(result.reasons.join('. '));
        return;
      }
      setSelectedClaimType(claimType);
      setStep('claim-form');
    } catch {
      setEligibilityError('Impossible de vérifier l\'éligibilité. Veuillez réessayer.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setProofs((prev) => [...prev, ...files].slice(0, 5));
  };

  const removeFile = (index: number) => {
    setProofs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInsurance || !selectedClaimType) return;

    const claimData: ClaimData = {
      type_claim: selectedClaimType,
      description,
      montant_reclame_gnf: parseInt(amount) || 0,
      preuves: proofs,
    };

    try {
      await submitClaimMutation.mutateAsync(claimData);
      setStep('success');
    } catch {
      // Error handled by mutation
    }
  };

  const renderClaimTypeIcon = (icon: string) => {
    switch (icon) {
      case 'home':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'wallet':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case 'scale':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        );
      case 'banknotes':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'home-damage':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderInsuranceSelection = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Sélectionnez une assurance</h2>
      <p className="text-gray-600 mb-6">Choisissez l&apos;assurance pour laquelle vous souhaitez faire une réclamation</p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : activeInsurances.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune assurance active</h3>
          <p className="text-gray-500 mb-4">Vous devez avoir une assurance active pour faire une réclamation</p>
          <Link
            href="/assurances/souscrire"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Souscrire une assurance
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {activeInsurances.map((insurance) => (
            <div
              key={insurance.id}
              onClick={() => handleInsuranceSelect(insurance)}
              className="p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', getStatusColor(insurance.statut))}>
                      {getStatusLabel(insurance.statut)}
                    </span>
                    <span className={clsx(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      insurance.type_assurance === 'SEJOUR_SEREIN'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    )}>
                      {getTypeLabel(insurance.type_assurance)}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 mt-2">{insurance.contract?.listing?.titre}</h3>
                  <p className="text-sm text-gray-500">{insurance.contract?.listing?.adresse_complete}</p>
                  <p className="text-xs text-gray-400 mt-1">N° {insurance.numero_police}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {formatMoney(insurance.prime_mensuelle_gnf)}
                  </div>
                  <div className="text-xs text-gray-500">/mois</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderClaimTypeSelection = () => (
    <div>
      <button
        onClick={() => setStep('select-insurance')}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-2">Type de réclamation</h2>
      <p className="text-gray-600 mb-6">Sélectionnez le type de sinistre à déclarer</p>

      {selectedInsurance && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="text-sm text-gray-500">Assurance sélectionnée</div>
          <div className="font-medium text-gray-900">{getTypeLabel(selectedInsurance.type_assurance)}</div>
          <div className="text-sm text-gray-600">N° {selectedInsurance.numero_police}</div>
        </div>
      )}

      {eligibilityError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div className="font-medium text-red-800">Non éligible</div>
              <div className="text-sm text-red-600">{eligibilityError}</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {availableClaimTypes.map((claimType) => (
          <div
            key={claimType.type}
            onClick={() => handleClaimTypeSelect(claimType.type)}
            className={clsx(
              'p-4 border rounded-xl cursor-pointer transition-all flex items-start gap-4',
              checkEligibilityMutation.isPending
                ? 'opacity-50 cursor-wait'
                : 'hover:border-blue-500 hover:shadow-md'
            )}
          >
            <div className={clsx(
              'p-2 rounded-lg',
              selectedInsurance?.type_assurance === 'SEJOUR_SEREIN'
                ? 'bg-green-100 text-green-600'
                : 'bg-amber-100 text-amber-600'
            )}>
              {renderClaimTypeIcon(claimType.icon)}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">{claimType.label}</div>
              <div className="text-sm text-gray-500">{claimType.description}</div>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );

  const renderClaimForm = () => {
    const claimTypeOption = CLAIM_TYPES.find((ct) => ct.type === selectedClaimType);

    return (
      <div>
        <button
          onClick={() => setStep('select-claim-type')}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Déclarer un sinistre</h2>
        <p className="text-gray-600 mb-6">{claimTypeOption?.label}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description du sinistre <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              required
              minLength={100}
              maxLength={2000}
              placeholder="Décrivez en détail les circonstances du sinistre, les dates, et tout élément pertinent..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <div className="text-xs text-gray-500 mt-1">
              {description.length}/2000 caractères (minimum 100)
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Montant réclamé (GNF) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min={0}
              placeholder="Ex: 5000000"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {amount && (
              <div className="text-sm text-gray-600 mt-1">
                = {formatMoney(parseInt(amount) || 0)}
              </div>
            )}
          </div>

          {/* Proofs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pièces justificatives
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
              <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600 mb-2">
                Glissez vos fichiers ici ou cliquez pour sélectionner
              </p>
              <p className="text-xs text-gray-500">PDF, JPG, PNG (max 5MB par fichier)</p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="proof-upload"
              />
              <label
                htmlFor="proof-upload"
                className="inline-block mt-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200"
              >
                Parcourir
              </label>
            </div>

            {/* File list */}
            {proofs.length > 0 && (
              <div className="mt-4 space-y-2">
                {proofs.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-gray-700 truncate max-w-xs">{file.name}</span>
                      <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Délai de traitement</p>
                <p className="text-blue-700">
                  Votre réclamation sera traitée sous 48 heures ouvrées. Un conseiller vous contactera pour valider les informations fournies.
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={description.length < 100 || !amount || submitClaimMutation.isPending}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitClaimMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Envoi en cours...
              </span>
            ) : (
              'Soumettre la réclamation'
            )}
          </button>

          {submitClaimMutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              Une erreur est survenue. Veuillez réessayer.
            </div>
          )}
        </form>
      </div>
    );
  };

  const renderSuccess = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Réclamation envoyée!</h2>
      <p className="text-gray-600 mb-8">
        Votre réclamation a été enregistrée avec succès.<br />
        Vous serez contacté sous 48 heures par notre équipe.
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/dashboard/mes-assurances"
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700"
        >
          Voir mes assurances
        </Link>
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200"
        >
          Retour au dashboard
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour au dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Déclarer un sinistre</h1>
          <p className="text-gray-600 mt-1">
            Signalez un problème couvert par votre assurance
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {step === 'select-insurance' && renderInsuranceSelection()}
          {step === 'select-claim-type' && renderClaimTypeSelection()}
          {step === 'claim-form' && renderClaimForm()}
          {step === 'success' && renderSuccess()}
        </div>
      </div>
    </div>
  );
}
