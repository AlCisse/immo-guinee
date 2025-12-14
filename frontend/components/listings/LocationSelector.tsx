'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Search, X, Check } from 'lucide-react';
import {
  GUINEA_REGIONS,
  POPULAR_QUARTIERS,
  DEFAULT_LOCATION,
  type Region,
  type Prefecture,
  type SousPrefecture,
} from '@/data/guinea-locations';

interface LocationSelectorProps {
  region?: string;
  prefecture?: string;
  quartier?: string;
  onRegionChange: (region: string) => void;
  onPrefectureChange: (prefecture: string) => void;
  onQuartierChange: (quartier: string) => void;
  regionError?: string;
  prefectureError?: string;
  quartierError?: string;
  required?: boolean;
}

export default function LocationSelector({
  region,
  prefecture,
  quartier,
  onRegionChange,
  onPrefectureChange,
  onQuartierChange,
  regionError,
  prefectureError,
  quartierError,
  required = true,
}: LocationSelectorProps) {
  // Initialize with default values (Kipé in Conakry)
  const [selectedRegion, setSelectedRegion] = useState<string>(region || DEFAULT_LOCATION.region);
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>(prefecture || DEFAULT_LOCATION.prefecture);
  const [selectedQuartier, setSelectedQuartier] = useState<string>(quartier || DEFAULT_LOCATION.quartier);
  const [searchQuery, setSearchQuery] = useState('');
  const [isQuartierDropdownOpen, setIsQuartierDropdownOpen] = useState(false);

  // Trigger initial callbacks on mount
  useEffect(() => {
    if (!region) {
      onRegionChange(DEFAULT_LOCATION.region);
    }
    if (!prefecture) {
      onPrefectureChange(DEFAULT_LOCATION.prefecture);
    }
    if (!quartier) {
      onQuartierChange(DEFAULT_LOCATION.quartier);
    }
  }, []);

  // Get available prefectures for selected region
  const availablePrefectures = useMemo(() => {
    const regionData = GUINEA_REGIONS.find(r => r.code === selectedRegion);
    return regionData?.prefectures || [];
  }, [selectedRegion]);

  // Get available quartiers for selected prefecture
  const availableQuartiers = useMemo(() => {
    for (const reg of GUINEA_REGIONS) {
      const pref = reg.prefectures.find(p => p.code === selectedPrefecture);
      if (pref) {
        return pref.sousPrefectures;
      }
    }
    return [];
  }, [selectedPrefecture]);

  // Filter quartiers by search query
  const filteredQuartiers = useMemo(() => {
    if (!searchQuery.trim()) return availableQuartiers;
    const query = searchQuery.toLowerCase();
    return availableQuartiers.filter(q =>
      q.nom.toLowerCase().includes(query)
    );
  }, [availableQuartiers, searchQuery]);

  // Handle region change
  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRegion = e.target.value;
    setSelectedRegion(newRegion);
    onRegionChange(newRegion);

    // Reset prefecture and quartier
    const newPrefectures = GUINEA_REGIONS.find(r => r.code === newRegion)?.prefectures || [];
    if (newPrefectures.length > 0) {
      const firstPref = newPrefectures[0].code;
      setSelectedPrefecture(firstPref);
      onPrefectureChange(firstPref);

      // Reset quartier
      const newQuartiers = newPrefectures[0].sousPrefectures;
      if (newQuartiers.length > 0) {
        setSelectedQuartier(newQuartiers[0].nom);
        onQuartierChange(newQuartiers[0].nom);
      } else {
        setSelectedQuartier('');
        onQuartierChange('');
      }
    } else {
      setSelectedPrefecture('');
      setSelectedQuartier('');
      onPrefectureChange('');
      onQuartierChange('');
    }
  };

  // Handle prefecture change
  const handlePrefectureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPrefecture = e.target.value;
    setSelectedPrefecture(newPrefecture);
    onPrefectureChange(newPrefecture);

    // Reset quartier
    for (const reg of GUINEA_REGIONS) {
      const pref = reg.prefectures.find(p => p.code === newPrefecture);
      if (pref && pref.sousPrefectures.length > 0) {
        setSelectedQuartier(pref.sousPrefectures[0].nom);
        onQuartierChange(pref.sousPrefectures[0].nom);
        break;
      }
    }
  };

  // Handle quartier selection
  const handleQuartierSelect = (quartierName: string) => {
    setSelectedQuartier(quartierName);
    onQuartierChange(quartierName);
    setIsQuartierDropdownOpen(false);
    setSearchQuery('');
  };

  // Get display names
  const selectedRegionName = GUINEA_REGIONS.find(r => r.code === selectedRegion)?.nom || '';
  const selectedPrefectureName = availablePrefectures.find(p => p.code === selectedPrefecture)?.name || '';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-5 h-5 text-primary-500" />
        <h3 className="font-semibold text-neutral-900 dark:text-white">
          Ville / Quartier {required && <span className="text-red-500">*</span>}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Region Dropdown */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Région
          </label>
          <div className="relative">
            <select
              value={selectedRegion}
              onChange={handleRegionChange}
              className={`
                w-full px-4 py-3 pr-10 rounded-xl border-2 appearance-none cursor-pointer
                bg-white dark:bg-dark-card transition-all duration-200
                ${regionError
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-neutral-200 dark:border-dark-border focus:border-primary-500'
                }
                focus:outline-none focus:ring-2 focus:ring-primary-500/20
                text-neutral-900 dark:text-white
              `}
            >
              {GUINEA_REGIONS.map(reg => (
                <option key={reg.code} value={reg.code}>
                  {reg.nom}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
          </div>
          {regionError && (
            <p className="mt-1.5 text-sm text-red-500">{regionError}</p>
          )}
        </div>

        {/* Prefecture Dropdown */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            {selectedRegion === '01' ? 'Commune' : 'Préfecture'}
          </label>
          <div className="relative">
            <select
              value={selectedPrefecture}
              onChange={handlePrefectureChange}
              className={`
                w-full px-4 py-3 pr-10 rounded-xl border-2 appearance-none cursor-pointer
                bg-white dark:bg-dark-card transition-all duration-200
                ${prefectureError
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-neutral-200 dark:border-dark-border focus:border-primary-500'
                }
                focus:outline-none focus:ring-2 focus:ring-primary-500/20
                text-neutral-900 dark:text-white
              `}
              disabled={availablePrefectures.length === 0}
            >
              {availablePrefectures.map(pref => (
                <option key={pref.code} value={pref.code}>
                  {pref.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
          </div>
          {prefectureError && (
            <p className="mt-1.5 text-sm text-red-500">{prefectureError}</p>
          )}
        </div>

        {/* Quartier Dropdown with Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            Quartier
          </label>
          <button
            type="button"
            onClick={() => setIsQuartierDropdownOpen(!isQuartierDropdownOpen)}
            className={`
              w-full px-4 py-3 rounded-xl border-2 text-left flex items-center justify-between
              bg-white dark:bg-dark-card transition-all duration-200
              ${quartierError
                ? 'border-red-500 focus:border-red-600'
                : isQuartierDropdownOpen
                  ? 'border-primary-500 ring-2 ring-primary-500/20'
                  : 'border-neutral-200 dark:border-dark-border hover:border-primary-300'
              }
              focus:outline-none
            `}
          >
            <span className={selectedQuartier ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}>
              {selectedQuartier || 'Sélectionner un quartier'}
            </span>
            <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${isQuartierDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isQuartierDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute z-50 w-full mt-2 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-neutral-200 dark:border-dark-border overflow-hidden"
              >
                {/* Search Input */}
                <div className="p-3 border-b border-neutral-100 dark:border-dark-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher un quartier..."
                      className="w-full pl-10 pr-10 py-2 rounded-lg border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-bg focus:outline-none focus:border-primary-500 text-sm"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-neutral-200 dark:hover:bg-dark-border rounded-full"
                      >
                        <X className="w-4 h-4 text-neutral-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Popular Quartiers (only for Conakry) */}
                {selectedRegion === '01' && !searchQuery && (
                  <div className="p-3 border-b border-neutral-100 dark:border-dark-border">
                    <p className="text-xs font-medium text-neutral-500 mb-2">Quartiers populaires</p>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_QUARTIERS.slice(0, 6).map(q => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleQuartierSelect(q)}
                          className={`
                            px-2.5 py-1 text-xs rounded-full transition-colors
                            ${selectedQuartier === q
                              ? 'bg-primary-500 text-white'
                              : 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 hover:bg-primary-100'
                            }
                          `}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quartier List */}
                <div className="max-h-60 overflow-y-auto">
                  {filteredQuartiers.length > 0 ? (
                    filteredQuartiers.map(q => (
                      <button
                        key={q.code}
                        type="button"
                        onClick={() => handleQuartierSelect(q.nom)}
                        className={`
                          w-full px-4 py-2.5 text-left flex items-center justify-between
                          hover:bg-neutral-50 dark:hover:bg-dark-bg transition-colors
                          ${selectedQuartier === q.nom ? 'bg-primary-50 dark:bg-primary-500/10' : ''}
                        `}
                      >
                        <span className={selectedQuartier === q.nom ? 'text-primary-600 font-medium' : 'text-neutral-700 dark:text-neutral-200'}>
                          {q.nom}
                        </span>
                        {selectedQuartier === q.nom && (
                          <Check className="w-4 h-4 text-primary-500" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-neutral-500 text-sm">
                      Aucun quartier trouvé
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {quartierError && (
            <p className="mt-1.5 text-sm text-red-500">{quartierError}</p>
          )}
        </div>
      </div>

      {/* Selected Location Summary */}
      {selectedQuartier && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary-50 dark:bg-primary-500/10 rounded-xl">
          <MapPin className="w-4 h-4 text-primary-500" />
          <span className="text-sm text-primary-700 dark:text-primary-400">
            {selectedQuartier}, {selectedPrefectureName}, {selectedRegionName}
          </span>
        </div>
      )}

      {/* Close dropdown on outside click */}
      {isQuartierDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsQuartierDropdownOpen(false)}
        />
      )}
    </div>
  );
}
