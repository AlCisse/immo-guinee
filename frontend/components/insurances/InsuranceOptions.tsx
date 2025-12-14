'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  INSURANCE_OPTIONS,
  InsuranceType,
  InsuranceOption,
  formatMoney,
  calculatePremium,
} from '@/lib/hooks/useInsurances';

// T227: InsuranceOptions component (SÉJOUR SEREIN, LOYER GARANTI)

interface InsuranceOptionsProps {
  monthlyRent: number;
  userType: 'locataire' | 'bailleur';
  onSelect: (type: InsuranceType) => void;
  selectedType?: InsuranceType | null;
}

function CoverageIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'shield':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
    case 'home':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    default:
      return null;
  }
}

function OptionCard({
  option,
  monthlyRent,
  isSelected,
  onSelect,
}: {
  option: InsuranceOption;
  monthlyRent: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const premium = calculatePremium(monthlyRent, option.primePercentage);
  const isSejourSerein = option.type === 'SEJOUR_SEREIN';

  return (
    <div
      onClick={onSelect}
      className={clsx(
        'relative rounded-2xl border-2 p-6 cursor-pointer transition-all',
        isSelected
          ? isSejourSerein
            ? 'border-green-500 bg-green-50 shadow-lg'
            : 'border-amber-500 bg-amber-50 shadow-lg'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div
          className={clsx(
            'absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center',
            isSejourSerein ? 'bg-green-500' : 'bg-amber-500'
          )}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <div
          className={clsx(
            'inline-block px-3 py-1 rounded-full text-xs font-medium mb-2',
            isSejourSerein ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          )}
        >
          {option.targetUser === 'locataire' ? 'Pour locataires' : 'Pour propriétaires'}
        </div>
        <h3 className="text-xl font-bold text-gray-900">{option.name}</h3>
        <p className="text-sm text-gray-600 mt-1">{option.description}</p>
      </div>

      {/* Premium */}
      <div className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <div className="text-sm text-gray-500">Prime mensuelle</div>
        <div className={clsx('text-2xl font-bold', isSejourSerein ? 'text-green-600' : 'text-amber-600')}>
          {formatMoney(premium)}
        </div>
        <div className="text-xs text-gray-400">{option.primePercentage}% du loyer mensuel</div>
      </div>

      {/* Coverages */}
      <div className="space-y-3 mb-4">
        <div className="text-sm font-medium text-gray-700">Garanties incluses :</div>
        {option.coverages.map((coverage, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className={clsx('p-2 rounded-lg', isSejourSerein ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600')}>
              <CoverageIcon icon={coverage.icon} />
            </div>
            <div>
              <div className="font-medium text-gray-900 text-sm">{coverage.name}</div>
              <div className="text-xs text-gray-500">{coverage.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <div className="border-t border-gray-100 pt-4">
        <div className="grid grid-cols-2 gap-2">
          {option.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-1 text-xs text-gray-600">
              <svg
                className={clsx('w-4 h-4', isSejourSerein ? 'text-green-500' : 'text-amber-500')}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {benefit}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function InsuranceOptions({
  monthlyRent,
  userType,
  onSelect,
  selectedType,
}: InsuranceOptionsProps) {
  // Filter options based on user type
  const availableOptions = INSURANCE_OPTIONS.filter(
    (option) => option.targetUser === userType
  );

  // If no specific user type, show all options
  const optionsToShow = availableOptions.length > 0 ? availableOptions : INSURANCE_OPTIONS;

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Protégez-vous avec ImmoGuinée</h2>
        <p className="text-gray-600">
          Choisissez l'assurance adaptée à votre situation pour une tranquillité d'esprit totale
        </p>
      </div>

      {/* Options Grid */}
      <div className={clsx('grid gap-6', optionsToShow.length > 1 ? 'md:grid-cols-2' : 'max-w-md mx-auto')}>
        {optionsToShow.map((option) => (
          <OptionCard
            key={option.type}
            option={option}
            monthlyRent={monthlyRent}
            isSelected={selectedType === option.type}
            onSelect={() => onSelect(option.type)}
          />
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Bon à savoir</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Délai de carence de 30 jours après souscription</li>
              <li>Renouvellement automatique sauf résiliation</li>
              <li>Résiliation possible à tout moment avec préavis de 30 jours</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
