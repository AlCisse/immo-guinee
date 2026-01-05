'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Search, X, Check, Crosshair, Loader2, Navigation, AlertCircle } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import {
  GUINEA_REGIONS,
  POPULAR_QUARTIERS,
  DEFAULT_LOCATION,
  type Region,
  type Prefecture,
  type SousPrefecture,
} from '@/data/guinea-locations';
import { useGeolocation, type NearbyPlace, type Coordinates } from '@/lib/hooks/useGeolocation';

interface LocationSelectorProps {
  region?: string;
  prefecture?: string;
  quartier?: string;
  onRegionChange: (region: string) => void;
  onPrefectureChange: (prefecture: string) => void;
  onQuartierChange: (quartier: string) => void;
  onLocationDetected?: (data: {
    coordinates: Coordinates;
    nearbyPlaces: NearbyPlace[];
    locationDescription: string;
    detectedQuartier?: string;
    detectedCommune?: string;
    detectedCity?: string;
  }) => void;
  onUseLocation?: (data: {
    quartier: string;
    locationDescription: string;
    coordinates: Coordinates;
  }) => void;
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
  onLocationDetected,
  onUseLocation,
  regionError,
  prefectureError,
  quartierError,
  required = true,
}: LocationSelectorProps) {
  const { t } = useTranslations('publish.location.geolocation');

  // Initialize with default values (Kipé in Conakry)
  const [selectedRegion, setSelectedRegion] = useState<string>(region || DEFAULT_LOCATION.region);
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>(prefecture || DEFAULT_LOCATION.prefecture);
  const [selectedQuartier, setSelectedQuartier] = useState<string>(quartier || DEFAULT_LOCATION.quartier);
  const [searchQuery, setSearchQuery] = useState('');
  const [isQuartierDropdownOpen, setIsQuartierDropdownOpen] = useState(false);
  const quartierSelectorRef = useRef<HTMLDivElement>(null);

  // Geolocation hook
  const { isLoading: isDetecting, error: geoError, detectPosition } = useGeolocation();
  const [detectedLocation, setDetectedLocation] = useState<{
    coordinates: Coordinates;
    nearbyPlaces: NearbyPlace[];
    locationDescription: string;
    detectedQuartier?: string;
    detectedCommune?: string;
    detectedCity?: string;
  } | null>(null);

  // Handle position detection
  const handleDetectPosition = async () => {
    const result = await detectPosition();
    if (result) {
      setDetectedLocation(result);
      onLocationDetected?.(result);
    }
  };

  // Find matching quartier in our data
  const findMatchingQuartier = (detectedName: string): { quartierName: string; found: boolean } => {
    if (!detectedName) return { quartierName: '', found: false };

    const normalizedDetected = detectedName.toLowerCase().trim();

    // Search through all quartiers
    for (const reg of GUINEA_REGIONS) {
      for (const pref of reg.prefectures) {
        for (const quartier of pref.sousPrefectures) {
          const normalizedQuartier = quartier.nom.toLowerCase().trim();

          // Check for exact match or partial match
          if (
            normalizedQuartier === normalizedDetected ||
            normalizedQuartier.includes(normalizedDetected) ||
            normalizedDetected.includes(normalizedQuartier) ||
            // Handle common variations
            normalizedQuartier.replace(/-/g, ' ') === normalizedDetected.replace(/-/g, ' ') ||
            normalizedQuartier.replace(/é/g, 'e') === normalizedDetected.replace(/é/g, 'e')
          ) {
            return { quartierName: quartier.nom, found: true };
          }
        }
      }
    }

    return { quartierName: detectedName, found: false };
  };

  // Handle using detected location
  const handleUseDetectedLocation = () => {
    if (!detectedLocation) return;

    const { detectedQuartier, detectedCommune, detectedCity, locationDescription, coordinates } = detectedLocation;
    let finalQuartier = detectedQuartier || '';

    // Try to find matching quartier
    if (detectedQuartier) {
      const { quartierName, found } = findMatchingQuartier(detectedQuartier);

      if (found) {
        // Found exact match - select it
        finalQuartier = quartierName;
        setSelectedQuartier(quartierName);
        onQuartierChange(quartierName);
      } else {
        // Not found in our data - still set the detected name
        setSelectedQuartier(detectedQuartier);
        onQuartierChange(detectedQuartier);
      }
    }

    // If detected city is Conakry, make sure Conakry region is selected
    if (detectedCity === 'Conakry' && selectedRegion !== '01') {
      setSelectedRegion('01');
      onRegionChange('01');

      const conakryPref = GUINEA_REGIONS.find(r => r.code === '01')?.prefectures[0];
      if (conakryPref) {
        setSelectedPrefecture(conakryPref.code);
        onPrefectureChange(conakryPref.code);
      }
    }

    // Call onUseLocation callback with the location data
    onUseLocation?.({
      quartier: finalQuartier,
      locationDescription: locationDescription || '',
      coordinates,
    });

    // Clear detection after using
    setDetectedLocation(null);
  };

  // Scroll to quartier selector when dropdown closes
  const scrollToQuartierSelector = () => {
    setTimeout(() => {
      quartierSelectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

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
    scrollToQuartierSelector();
  };

  // Handle dropdown backdrop click
  const handleQuartierBackdropClick = () => {
    setIsQuartierDropdownOpen(false);
    scrollToQuartierSelector();
  };

  // Get display names
  const selectedRegionName = GUINEA_REGIONS.find(r => r.code === selectedRegion)?.nom || '';
  const selectedPrefectureName = availablePrefectures.find(p => p.code === selectedPrefecture)?.name || '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary-500" />
          <h3 className="font-semibold text-neutral-900 dark:text-white">
            {t('cityRegion')} {required && <span className="text-red-500">*</span>}
          </h3>
        </div>

        {/* Detect Position Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleDetectPosition}
          disabled={isDetecting}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all font-medium text-sm shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDetecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">{t('detecting')}</span>
            </>
          ) : (
            <>
              <Crosshair className="w-4 h-4" />
              <span className="hidden sm:inline">{t('detectPosition')}</span>
              <span className="sm:hidden">{t('position')}</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Geolocation Error */}
      {geoError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">{geoError}</span>
        </motion.div>
      )}

      {/* Detected Location Info */}
      {detectedLocation && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-emerald-500" />
              <span className="font-semibold text-emerald-800 dark:text-emerald-200">{t('positionDetected')}</span>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUseDetectedLocation}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {t('useThisLocation')}
            </motion.button>
          </div>

          {/* Detected Quartier/Commune */}
          {(detectedLocation.detectedQuartier || detectedLocation.detectedCommune) && (
            <div className="mb-3 p-3 bg-white dark:bg-dark-card rounded-lg border border-emerald-200 dark:border-emerald-500/30">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-2">{t('detectedLocation')} :</p>
              <div className="flex flex-wrap gap-2">
                {detectedLocation.detectedQuartier && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    <MapPin className="w-4 h-4" />
                    {t('quartier')}: {detectedLocation.detectedQuartier}
                  </span>
                )}
                {detectedLocation.detectedCommune && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-500/20 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300">
                    {t('prefecture')}: {detectedLocation.detectedCommune}
                  </span>
                )}
                {detectedLocation.detectedCity && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-500/20 rounded-lg text-sm font-medium text-purple-700 dark:text-purple-300">
                    {detectedLocation.detectedCity}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Nearby Places */}
          {detectedLocation.nearbyPlaces.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                {t('nearbyPlaces')} ({detectedLocation.nearbyPlaces.length > 3 ? 3 : detectedLocation.nearbyPlaces.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {detectedLocation.nearbyPlaces.slice(0, 3).map((place, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-dark-card rounded-lg text-sm text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                  >
                    <MapPin className="w-3 h-3" />
                    {place.name} {place.distance > 0 && `- ${place.distance}m`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Generated Description */}
          {detectedLocation.locationDescription && (
            <div className="p-3 bg-white dark:bg-dark-card rounded-lg border border-emerald-200 dark:border-emerald-500/30">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">{t('generatedDescription')} :</p>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 italic">
                "{detectedLocation.locationDescription}"
              </p>
            </div>
          )}

          {/* Coordinates */}
          <div className="mt-3 flex items-center gap-4 text-xs text-emerald-600 dark:text-emerald-400">
            <span>Lat: {detectedLocation.coordinates.latitude.toFixed(6)}</span>
            <span>Lon: {detectedLocation.coordinates.longitude.toFixed(6)}</span>
          </div>
        </motion.div>
      )}


      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Region Dropdown */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            {t('region')}
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
            {selectedRegion === '01' ? t('commune') : t('prefecture')}
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
        <div ref={quartierSelectorRef} className="relative">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            {t('quartier')}
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
              {selectedQuartier || t('selectQuartier')}
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
                      placeholder={t('searchQuartier')}
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
                    <p className="text-xs font-medium text-neutral-500 mb-2">{t('popularQuartiers')}</p>
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
                      {t('noQuartierFound')}
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
          onClick={handleQuartierBackdropClick}
        />
      )}
    </div>
  );
}
