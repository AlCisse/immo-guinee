'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type SimpleContractType = 'location' | 'vente';

interface ContractTypeSelectorProps {
  value?: SimpleContractType;
  onChange: (type: SimpleContractType) => void;
  listingType?: string;
}

interface ContractTypeOption {
  type: SimpleContractType;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const contractTypes: ContractTypeOption[] = [
  {
    type: 'location',
    title: 'Contrat de Location',
    description: 'Location d\'un bien immobilier (résidentiel ou commercial)',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    type: 'vente',
    title: 'Contrat de Vente',
    description: 'Promesse ou acte de vente d\'un bien immobilier',
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export default function ContractTypeSelector({
  value,
  onChange,
  listingType,
}: ContractTypeSelectorProps) {
  const [hoveredType, setHoveredType] = useState<SimpleContractType | null>(null);

  // All contract types are available
  const availableTypes = contractTypes;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Type de contrat</h3>
      <p className="text-sm text-gray-500">
        Sélectionnez le type de contrat adapté à votre situation
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableTypes.map((option) => {
          const isSelected = value === option.type;
          const isHovered = hoveredType === option.type;

          return (
            <button
              key={option.type}
              type="button"
              onClick={() => onChange(option.type)}
              onMouseEnter={() => setHoveredType(option.type)}
              onMouseLeave={() => setHoveredType(null)}
              className={cn(
                'relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all duration-200',
                isSelected
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
                  : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-gray-50',
                isHovered && !isSelected && 'shadow-md'
              )}
              aria-pressed={isSelected}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500">
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}

              {/* Icon */}
              <div
                className={cn(
                  'mb-3 rounded-lg p-2',
                  isSelected ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'
                )}
              >
                {option.icon}
              </div>

              {/* Content */}
              <h4
                className={cn(
                  'font-semibold',
                  isSelected ? 'text-primary-900' : 'text-gray-900'
                )}
              >
                {option.title}
              </h4>
              <p className="mt-1 text-sm text-gray-500">{option.description}</p>
            </button>
          );
        })}
      </div>

      {availableTypes.length === 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
          <p className="text-yellow-800">
            Aucun type de contrat disponible pour ce type de bien.
          </p>
        </div>
      )}
    </div>
  );
}
