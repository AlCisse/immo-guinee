'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import InsuranceOptions from '@/components/insurances/InsuranceOptions';
import {
  InsuranceType,
  useSubscribeInsurance,
  formatMoney,
  calculatePremium,
  INSURANCE_OPTIONS,
} from '@/lib/hooks/useInsurances';

// T226: Insurance subscription page

interface Contract {
  id: string;
  reference: string;
  statut: string;
  donnees_personnalisees: {
    montant_loyer_gnf?: number;
  };
  listing: {
    id: string;
    titre: string;
    adresse_complete: string;
    type_bien: string;
  };
  locataire?: {
    id: string;
    nom_complet: string;
  };
  bailleur?: {
    id: string;
    nom_complet: string;
  };
}

async function fetchUserContracts(): Promise<Contract[]> {
  const response = await apiClient.get('/contracts/me');
  return response.data.data || [];
}

type Step = 'select-contract' | 'select-insurance' | 'confirm' | 'success';

export default function InsuranceSubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedContractId = searchParams.get('contrat');

  const [step, setStep] = useState<Step>('select-contract');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedInsurance, setSelectedInsurance] = useState<InsuranceType | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const { data: contracts, isLoading: loadingContracts } = useQuery({
    queryKey: ['user-contracts'],
    queryFn: fetchUserContracts,
  });

  const subscribeMutation = useSubscribeInsurance();

  // Auto-select contract if preselected
  useEffect(() => {
    if (preselectedContractId && contracts) {
      const contract = contracts.find((c) => c.id === preselectedContractId);
      if (contract) {
        setSelectedContract(contract);
        setStep('select-insurance');
      }
    }
  }, [preselectedContractId, contracts]);

  // Filter active contracts
  const activeContracts = contracts?.filter((c) => c.statut === 'SIGNE') || [];

  const handleContractSelect = (contract: Contract) => {
    setSelectedContract(contract);
    setStep('select-insurance');
  };

  const handleInsuranceSelect = (type: InsuranceType) => {
    setSelectedInsurance(type);
    setStep('confirm');
  };

  const handleSubscribe = async () => {
    if (!selectedContract || !selectedInsurance) return;

    try {
      await subscribeMutation.mutateAsync({
        contrat_id: selectedContract.id,
        type_assurance: selectedInsurance,
      });
      setStep('success');
    } catch (error) {
      console.error('Subscription error:', error);
    }
  };

  const getMonthlyRent = () => {
    return selectedContract?.donnees_personnalisees?.montant_loyer_gnf || 0;
  };

  const getSelectedOption = () => {
    return INSURANCE_OPTIONS.find((o) => o.type === selectedInsurance);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {['select-contract', 'select-insurance', 'confirm'].map((s, index) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s
                ? 'bg-blue-600 text-white'
                : ['select-contract', 'select-insurance', 'confirm'].indexOf(step) > index
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
            }`}
          >
            {['select-contract', 'select-insurance', 'confirm'].indexOf(step) > index ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              index + 1
            )}
          </div>
          {index < 2 && (
            <div
              className={`w-16 h-1 mx-2 ${
                ['select-contract', 'select-insurance', 'confirm'].indexOf(step) > index
                  ? 'bg-green-500'
                  : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderContractSelection = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Sélectionnez un contrat</h2>
      <p className="text-gray-600 mb-6">Choisissez le contrat de location que vous souhaitez assurer</p>

      {loadingContracts ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : activeContracts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <svg
            className="w-12 h-12 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun contrat actif</h3>
          <p className="text-gray-500 mb-4">Vous devez avoir un contrat signé pour souscrire à une assurance</p>
          <Link
            href="/annonces"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Rechercher un logement
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {activeContracts.map((contract) => (
            <div
              key={contract.id}
              onClick={() => handleContractSelect(contract)}
              className="p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{contract.listing.titre}</h3>
                  <p className="text-sm text-gray-500 mt-1">{contract.listing.adresse_complete}</p>
                  <p className="text-xs text-gray-400 mt-2">Réf: {contract.reference}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {formatMoney(contract.donnees_personnalisees?.montant_loyer_gnf || 0)}
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

  const renderInsuranceSelection = () => (
    <div>
      <button
        onClick={() => setStep('select-contract')}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour
      </button>

      {selectedContract && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="text-sm text-gray-500">Contrat sélectionné</div>
          <div className="font-medium text-gray-900">{selectedContract.listing.titre}</div>
          <div className="text-sm text-gray-600">
            Loyer: {formatMoney(getMonthlyRent())}/mois
          </div>
        </div>
      )}

      <InsuranceOptions
        monthlyRent={getMonthlyRent()}
        userType="locataire"
        onSelect={handleInsuranceSelect}
        selectedType={selectedInsurance}
      />
    </div>
  );

  const renderConfirmation = () => {
    const option = getSelectedOption();
    const premium = calculatePremium(getMonthlyRent(), option?.primePercentage || 2);

    return (
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

        <h2 className="text-xl font-bold text-gray-900 mb-6">Confirmation de souscription</h2>

        {/* Summary */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h3 className="font-medium text-gray-900 mb-4">Récapitulatif</h3>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Bien assuré</span>
              <span className="font-medium">{selectedContract?.listing.titre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Adresse</span>
              <span className="font-medium text-sm">{selectedContract?.listing.adresse_complete}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Type d&apos;assurance</span>
              <span className="font-medium">{option?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Loyer mensuel</span>
              <span className="font-medium">{formatMoney(getMonthlyRent())}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex justify-between text-lg">
                <span className="font-medium text-gray-900">Prime mensuelle</span>
                <span className="font-bold text-blue-600">{formatMoney(premium)}</span>
              </div>
              <div className="text-sm text-gray-500 text-right">
                {formatMoney(premium * 12)}/an
              </div>
            </div>
          </div>
        </div>

        {/* Coverages */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="font-medium text-gray-900 mb-4">Garanties incluses</h3>
          <div className="space-y-3">
            {option?.coverages.map((coverage, index) => (
              <div key={index} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900">{coverage.name}</div>
                  <div className="text-sm text-gray-500">{coverage.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              J&apos;ai lu et j&apos;accepte les{' '}
              <a href="#" className="text-blue-600 hover:underline">
                conditions générales d&apos;assurance
              </a>{' '}
              et la{' '}
              <a href="#" className="text-blue-600 hover:underline">
                politique de confidentialité
              </a>
            </span>
          </label>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubscribe}
          disabled={!acceptedTerms || subscribeMutation.isPending}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {subscribeMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Souscription en cours...
            </span>
          ) : (
            'Confirmer la souscription'
          )}
        </button>

        {subscribeMutation.isError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            Une erreur est survenue. Veuillez réessayer.
          </div>
        )}
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
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Souscription réussie!</h2>
      <p className="text-gray-600 mb-8">
        Votre assurance {getSelectedOption()?.name} est maintenant active.<br />
        Vous recevrez votre certificat d&apos;assurance par email.
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
          <h1 className="text-2xl font-bold text-gray-900">Souscrire à une assurance</h1>
        </div>

        {/* Step Indicator */}
        {step !== 'success' && renderStepIndicator()}

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {step === 'select-contract' && renderContractSelection()}
          {step === 'select-insurance' && renderInsuranceSelection()}
          {step === 'confirm' && renderConfirmation()}
          {step === 'success' && renderSuccess()}
        </div>
      </div>
    </div>
  );
}
