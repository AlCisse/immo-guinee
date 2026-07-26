'use client';

import { useState, useEffect } from 'react';
import type { TypeBien } from './TypeBienSelector';
import { CONAKRY_QUARTIERS, CONAKRY_COMMUNES } from '@/lib/data/communes';

export interface SearchFiltersState {
  operationType?: 'LOCATION' | 'VENTE';
  typeBien?: TypeBien;
  commune?: string;
  quartier?: string;
  prixMin?: number;
  prixMax?: number;
  superficieMin?: number;
  superficieMax?: number;
  nombreChambresMin?: number;
  nombreChambresMax?: number;
  cautionMax?: number;
}

interface SearchFiltersProps {
  initialFilters?: SearchFiltersState;
  onFiltersChange: (filters: SearchFiltersState) => void;
  onSearch: () => void;
  showMobileFilters?: boolean;
  onCloseMobileFilters?: () => void;
}

export default function SearchFilters({
  initialFilters = {},
  onFiltersChange,
  onSearch,
  showMobileFilters = false,
  onCloseMobileFilters,
}: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFiltersState>(initialFilters);
  const [availableQuartiers, setAvailableQuartiers] = useState<string[]>([]);

  // Update available quartiers when commune changes
  useEffect(() => {
    if (filters.commune) {
      // Get all quartiers for the selected commune
      const quartiersForCommune = CONAKRY_QUARTIERS
        .filter((q) => q.commune === filters.commune)
        .map((q) => q.name);
      setAvailableQuartiers(quartiersForCommune);
      // Reset quartier if it's not in the new commune
      if (filters.quartier && !quartiersForCommune.includes(filters.quartier)) {
        handleFilterChange('quartier', undefined);
      }
    } else {
      setAvailableQuartiers([]);
      handleFilterChange('quartier', undefined);
    }
  }, [filters.commune]);

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleFilterChange = (key: keyof SearchFiltersState, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseInt(value.replace(/\s/g, ''), 10);
    handleFilterChange(type === 'min' ? 'prixMin' : 'prixMax', numValue);
  };

  const handleReset = () => {
    setFilters({});
    onFiltersChange({});
  };

  const formatNumberInput = (value: number | undefined): string => {
    if (!value) return '';
    return value.toString();
  };

  const typeBienOptions: { value: TypeBien; label: string }[] = [
    { value: 'STUDIO', label: 'Studio' },
    { value: 'CHAMBRE_SALON', label: 'Chambre-Salon' },
    { value: 'APPARTEMENT_2CH', label: '2 Chambres' },
    { value: 'APPARTEMENT_3CH', label: '3 Chambres' },
    { value: 'VILLA', label: 'Villa' },
    { value: 'DUPLEX', label: 'Duplex' },
    { value: 'BUREAU', label: 'Bureau' },
  ];

  const filterContent = (
    <div className="space-y-6">
      {/* Header for mobile */}
      {showMobileFilters && (
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-dark-border">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Filtres</h2>
          <button
            onClick={onCloseMobileFilters}
            className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-success-500 rounded-lg"
            aria-label="Fermer les filtres"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Type d'opération */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Type d&apos;opération
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              handleFilterChange('operationType', filters.operationType === 'LOCATION' ? undefined : 'LOCATION')
            }
            className={`py-2 px-4 rounded-lg border-2 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 ${
              filters.operationType === 'LOCATION'
                ? 'border-secondary-600 bg-secondary-50 text-secondary-700'
                : 'border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-card text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
            }`}
          >
            Location
          </button>
          <button
            type="button"
            onClick={() =>
              handleFilterChange('operationType', filters.operationType === 'VENTE' ? undefined : 'VENTE')
            }
            className={`py-2 px-4 rounded-lg border-2 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 ${
              filters.operationType === 'VENTE'
                ? 'border-success-600 bg-success-50 text-success-700'
                : 'border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-card text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
            }`}
          >
            Vente
          </button>
        </div>
      </div>

      {/* Type de bien */}
      <div>
        <label htmlFor="filter-type-bien" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Type de bien
        </label>
        <select
          id="filter-type-bien"
          value={filters.typeBien || ''}
          onChange={(e) => handleFilterChange('typeBien', e.target.value || undefined)}
          className="w-full px-4 py-2 border border-neutral-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-success-500 focus:border-success-500 transition-colors"
        >
          <option value="">Tous les types</option>
          {typeBienOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Commune */}
      <div>
        <label htmlFor="filter-commune" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Commune
        </label>
        <select
          id="filter-commune"
          value={filters.commune || ''}
          onChange={(e) => handleFilterChange('commune', e.target.value || undefined)}
          className="w-full px-4 py-2 border border-neutral-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-success-500 focus:border-success-500 transition-colors"
        >
          <option value="">Toutes les communes</option>
          {CONAKRY_COMMUNES.map((commune) => (
            <option key={commune} value={commune}>
              {commune}
            </option>
          ))}
        </select>
      </div>

      {/* Quartier */}
      <div>
        <label htmlFor="filter-quartier" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Quartier
        </label>
        <select
          id="filter-quartier"
          value={filters.quartier || ''}
          onChange={(e) => handleFilterChange('quartier', e.target.value || undefined)}
          disabled={!filters.commune}
          className="w-full px-4 py-2 border border-neutral-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-success-500 focus:border-success-500 transition-colors disabled:bg-neutral-100 dark:bg-dark-hover disabled:cursor-not-allowed"
        >
          <option value="">Tous les quartiers</option>
          {availableQuartiers.map((quartier) => (
            <option key={quartier} value={quartier}>
              {quartier}
            </option>
          ))}
        </select>
        {!filters.commune && (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Sélectionnez d&apos;abord une commune</p>
        )}
      </div>

      {/* Prix min/max */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Prix (GNF)</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="filter-prix-min" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">
              Min
            </label>
            <input
              type="number"
              id="filter-prix-min"
              value={formatNumberInput(filters.prixMin)}
              onChange={(e) => handlePriceChange('min', e.target.value)}
              placeholder="0"
              min="0"
              step="100000"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-success-500 focus:border-success-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="filter-prix-max" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">
              Max
            </label>
            <input
              type="number"
              id="filter-prix-max"
              value={formatNumberInput(filters.prixMax)}
              onChange={(e) => handlePriceChange('max', e.target.value)}
              placeholder="Illimité"
              min="0"
              step="100000"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-success-500 focus:border-success-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Superficie min/max */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Superficie (m²)</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="filter-superficie-min" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">
              Min
            </label>
            <input
              type="number"
              id="filter-superficie-min"
              value={formatNumberInput(filters.superficieMin)}
              onChange={(e) =>
                handleFilterChange('superficieMin', e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
              placeholder="0"
              min="0"
              step="10"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-success-500 focus:border-success-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="filter-superficie-max" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">
              Max
            </label>
            <input
              type="number"
              id="filter-superficie-max"
              value={formatNumberInput(filters.superficieMax)}
              onChange={(e) =>
                handleFilterChange('superficieMax', e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
              placeholder="Illimité"
              min="0"
              step="10"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-success-500 focus:border-success-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Nombre de chambres min/max */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Nombre de chambres</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="filter-chambres-min" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">
              Min
            </label>
            <select
              id="filter-chambres-min"
              value={filters.nombreChambresMin || ''}
              onChange={(e) =>
                handleFilterChange('nombreChambresMin', e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-success-500 focus:border-success-500 transition-colors"
            >
              <option value="">Min</option>
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-chambres-max" className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">
              Max
            </label>
            <select
              id="filter-chambres-max"
              value={filters.nombreChambresMax || ''}
              onChange={(e) =>
                handleFilterChange('nombreChambresMax', e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-success-500 focus:border-success-500 transition-colors"
            >
              <option value="">Max</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Caution max (only for locations) */}
      {filters.operationType === 'LOCATION' && (
        <div>
          <label htmlFor="filter-caution-max" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Caution maximale (mois de loyer)
          </label>
          <select
            id="filter-caution-max"
            value={filters.cautionMax || ''}
            onChange={(e) =>
              handleFilterChange('cautionMax', e.target.value ? parseInt(e.target.value, 10) : undefined)
            }
            className="w-full px-4 py-2 border border-neutral-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-success-500 focus:border-success-500 transition-colors"
          >
            <option value="">Peu importe</option>
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <option key={num} value={num}>
                {num} mois maximum
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Action buttons */}
      <div className="pt-4 border-t border-neutral-200 dark:border-dark-border space-y-3">
        <button
          type="button"
          onClick={onSearch}
          className="w-full bg-success-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-success-700 transition-colors focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2"
        >
          Rechercher
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="w-full bg-white dark:bg-dark-card text-neutral-700 dark:text-neutral-300 py-2 px-6 rounded-lg font-medium border border-neutral-300 dark:border-dark-border hover:bg-neutral-50 dark:bg-dark-bg transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
        >
          Réinitialiser les filtres
        </button>
      </div>
    </div>
  );

  // Mobile: Full screen overlay
  if (showMobileFilters) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-dark-card overflow-y-auto">
        <div className="p-6">{filterContent}</div>
      </div>
    );
  }

  // Desktop: Regular component
  return (
    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-neutral-200 dark:border-dark-border p-6">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        Filtres de recherche
      </h2>
      {filterContent}
    </div>
  );
}
