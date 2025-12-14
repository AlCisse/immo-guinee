'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { CONAKRY_COMMUNES, CONAKRY_QUARTIERS } from '@/lib/data/communes';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Heart,
  Grid3X3,
  List,
  ChevronDown,
  X,
  Bed,
  Bath,
  Square,
  Sparkles,
  Check,
} from 'lucide-react';

// Types
interface Listing {
  id: string;
  titre: string;
  type_bien: string;
  type_transaction: string;
  loyer_mensuel: string | number;
  prix_vente?: string | number;
  formatted_price?: string;
  quartier: string;
  commune: string;
  adresse_complete: string | null;
  nombre_chambres: number;
  nombre_salles_bain: number;
  surface_m2: number;
  photos: string | string[] | null;
  photo_principale: string | null;
  main_photo_url: string;
  statut: string;
  is_premium?: boolean;
  created_at: string;
}

// Items per page for pagination
const ITEMS_PER_PAGE = 12;

// Filter options
const propertyTypes = ['Tous', 'APPARTEMENT', 'MAISON', 'VILLA', 'STUDIO', 'BUREAU', 'MAGASIN', 'TERRAIN'];
const propertyTypeLabels: Record<string, string> = {
  'Tous': 'Tous',
  'APPARTEMENT': 'Appartement',
  'MAISON': 'Maison',
  'VILLA': 'Villa',
  'STUDIO': 'Studio',
  'BUREAU': 'Bureau',
  'MAGASIN': 'Magasin',
  'TERRAIN': 'Terrain',
};

const priceRanges = [
  { label: 'Tous les prix', min: 0, max: 0 },
  { label: 'Moins de 5M GNF', min: 0, max: 5000000 },
  { label: '5M - 10M GNF', min: 5000000, max: 10000000 },
  { label: '10M - 20M GNF', min: 10000000, max: 20000000 },
  { label: 'Plus de 20M GNF', min: 20000000, max: 0 },
];

const sortOptions = [
  { label: 'Plus recents', value: 'recent' },
  { label: 'Prix croissant', value: 'price_asc' },
  { label: 'Prix decroissant', value: 'price_desc' },
  { label: 'Surface', value: 'area' },
];

// Normalize string (remove accents) for search
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// Calculate distance between two GPS coordinates (in km)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Get nearby quartiers based on GPS coordinates
const getNearbyQuartiers = (selectedQuartierName: string, maxDistance: number = 5): string[] => {
  const selectedQuartier = CONAKRY_QUARTIERS.find(
    q => normalizeString(q.name) === normalizeString(selectedQuartierName)
  );

  if (!selectedQuartier) return [];

  return CONAKRY_QUARTIERS
    .filter(q => normalizeString(q.name) !== normalizeString(selectedQuartierName))
    .map(q => ({
      ...q,
      distance: calculateDistance(selectedQuartier.lat, selectedQuartier.lng, q.lat, q.lng)
    }))
    .filter(q => q.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .map(q => q.name);
};

// Format price
const formatPrice = (price: number | string | undefined | null) => {
  if (price === undefined || price === null) return '0 GNF';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0 GNF';
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + ' Mrd GNF';
  }
  if (num >= 1000000) {
    const millions = num / 1000000;
    return millions % 1 === 0
      ? millions.toFixed(0) + 'M GNF'
      : millions.toFixed(1) + 'M GNF';
  }
  return new Intl.NumberFormat('fr-GN').format(num) + ' GNF';
};

// Property Card
function PropertyCard({ property, viewMode }: { property: Listing; viewMode: 'grid' | 'list' }) {
  const [isFavorite, setIsFavorite] = useState(false);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await api.favorites.toggle(property.id);
      setIsFavorite(!isFavorite);
    } catch {
      // User not authenticated
    }
  };

  const isNew = new Date(property.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
  const isLocation = property.type_transaction === 'LOCATION' || property.type_transaction === 'location';
  const isLocationCourte = property.type_transaction === 'LOCATION_COURTE' || property.type_transaction === 'location_courte';
  const price = (isLocation || isLocationCourte) ? property.loyer_mensuel : property.prix_vente;

  // Get photo URL
  const getPhotoUrl = (): string | null => {
    if (property.main_photo_url && property.main_photo_url !== '/images/placeholder.jpg') {
      return property.main_photo_url;
    }
    if (property.photo_principale) {
      return property.photo_principale;
    }
    if (property.photos) {
      if (typeof property.photos === 'string') {
        try {
          const parsed = JSON.parse(property.photos);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
        } catch {
          return null;
        }
      }
      if (Array.isArray(property.photos) && property.photos.length > 0) {
        return property.photos[0];
      }
    }
    return null;
  };

  const photoUrl = getPhotoUrl();

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
      >
        <Link href={`/bien/${property.id}`} className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative w-full sm:w-64 h-48 sm:h-auto flex-shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt={property.titre} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary-200 to-primary-300 dark:from-primary-900 dark:to-primary-800" />
            )}

            {/* Badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              {property.is_premium && (
                <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-full">
                  <Sparkles className="w-3 h-3" />
                  Premium
                </span>
              )}
              {isNew && (
                <span className="px-2 py-1 bg-primary-500 text-white text-xs font-semibold rounded-full">
                  Nouveau
                </span>
              )}
            </div>

            {/* Favorite */}
            <button
              onClick={handleToggleFavorite}
              className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow-lg"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-neutral-600'}`} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-md">
                    {propertyTypeLabels[property.type_bien] || property.type_bien}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${
                    isLocation
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                      : isLocationCourte
                      ? 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400'
                      : 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400'
                  }`}>
                    {isLocation ? 'A louer' : isLocationCourte ? 'Courte durée' : 'A vendre'}
                  </span>
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white text-lg mb-1">
                  {property.titre}
                </h3>
                <div className="flex items-center gap-1 text-neutral-500 text-sm">
                  <MapPin className="w-4 h-4" />
                  {property.quartier}, {property.commune}
                </div>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-primary-500">
                  {property.formatted_price || formatPrice(price)}
                </p>
                {isLocation && (
                  <span className="text-sm text-neutral-500">/mois</span>
                )}
                {isLocationCourte && (
                  <span className="text-sm text-purple-500">/jour</span>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-neutral-100 dark:border-dark-border">
              {property.nombre_chambres > 0 && (
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <Bed className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm">{property.nombre_chambres} ch.</span>
                </div>
              )}
              {property.nombre_salles_bain > 0 && (
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <Bath className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm">{property.nombre_salles_bain} sdb.</span>
                </div>
              )}
              {property.surface_m2 > 0 && (
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <Square className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm">{property.surface_m2} m2</span>
                </div>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden group"
    >
      <Link href={`/bien/${property.id}`}>
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={property.titre}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-200 to-primary-300 dark:from-primary-900 dark:to-primary-800 group-hover:scale-105 transition-transform duration-300" />
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {property.is_premium && (
              <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-full">
                <Sparkles className="w-3 h-3" />
                Premium
              </span>
            )}
            {isNew && (
              <span className="px-2 py-1 bg-primary-500 text-white text-xs font-semibold rounded-full">
                Nouveau
              </span>
            )}
          </div>

          {/* Transaction Type Badge */}
          <div className="absolute top-3 right-12">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
              isLocation
                ? 'bg-blue-500 text-white'
                : isLocationCourte
                ? 'bg-purple-500 text-white'
                : 'bg-green-500 text-white'
            }`}>
              {isLocation ? 'A louer' : isLocationCourte ? 'Courte durée' : 'A vendre'}
            </span>
          </div>

          {/* Favorite */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleFavorite}
            className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-dark-card/90 rounded-full shadow-lg z-10"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-neutral-600'}`} />
          </motion.button>

          {/* Price */}
          <div className="absolute bottom-3 left-3">
            <span className="px-3 py-1.5 bg-white dark:bg-dark-card rounded-lg font-bold text-neutral-900 dark:text-white shadow-lg">
              {property.formatted_price || formatPrice(price)}
              {isLocation && (
                <span className="text-sm font-normal text-neutral-500">/mois</span>
              )}
              {isLocationCourte && (
                <span className="text-sm font-normal text-purple-500">/jour</span>
              )}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-md">
              {propertyTypeLabels[property.type_bien] || property.type_bien}
            </span>
          </div>

          <h3 className="font-semibold text-neutral-900 dark:text-white mb-1 line-clamp-1 group-hover:text-primary-500 transition-colors">
            {property.titre}
          </h3>

          <div className="flex items-center gap-1 text-neutral-500 text-sm mb-3">
            <MapPin className="w-4 h-4" />
            {property.quartier}, {property.commune}
          </div>

          {/* Features */}
          <div className="flex items-center gap-4 pt-3 border-t border-neutral-100 dark:border-dark-border text-sm text-neutral-600 dark:text-neutral-300">
            {property.nombre_chambres > 0 && <span>{property.nombre_chambres} ch.</span>}
            {property.nombre_salles_bain > 0 && (
              <>
                <span className="w-1 h-1 bg-neutral-300 rounded-full" />
                <span>{property.nombre_salles_bain} sdb.</span>
              </>
            )}
            {property.surface_m2 > 0 && (
              <>
                <span className="w-1 h-1 bg-neutral-300 rounded-full" />
                <span>{property.surface_m2} m2</span>
              </>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Filter Chip
function FilterChip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
        isActive
          ? 'bg-primary-500 text-white'
          : 'bg-white dark:bg-dark-card text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-dark-border hover:border-primary-300'
      }`}
    >
      {label}
    </motion.button>
  );
}

// Main search content component
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize state from URL params
  const typeBienParam = searchParams.get('type_bien') || 'Tous';
  const typeTransactionParam = searchParams.get('type_transaction') as 'LOCATION' | 'VENTE' | null;

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState(typeBienParam.includes(',') ? 'Tous' : typeBienParam);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(typeBienParam.includes(',') ? typeBienParam.split(',') : []);
  const [selectedQuartier, setSelectedQuartier] = useState(searchParams.get('quartier') || 'Tous');
  const [selectedCommune, setSelectedCommune] = useState(searchParams.get('commune') || 'Tous');
  const [selectedPriceRange, setSelectedPriceRange] = useState(0);
  const [selectedSort, setSelectedSort] = useState('recent');
  const [transactionType, setTransactionType] = useState<'all' | 'LOCATION' | 'VENTE'>(
    typeTransactionParam || 'all'
  );
  const [currentPage, setCurrentPage] = useState(1);

  // Quartier search states
  const [quartierSearchInput, setQuartierSearchInput] = useState('');
  const [showQuartierDropdown, setShowQuartierDropdown] = useState(false);

  // Filter quartiers based on input (accent-insensitive)
  const filteredQuartiers = useMemo(() => {
    if (!quartierSearchInput) return [];
    const normalizedInput = normalizeString(quartierSearchInput);
    return CONAKRY_QUARTIERS
      .filter(q => normalizeString(q.name).includes(normalizedInput))
      .slice(0, 8); // Limit suggestions
  }, [quartierSearchInput]);

  // Get nearby quartiers for current selection
  const nearbyQuartiers = useMemo(() => {
    if (selectedQuartier === 'Tous') return [];
    return getNearbyQuartiers(selectedQuartier, 5); // 5km radius
  }, [selectedQuartier]);

  // Update URL when filters change
  const updateURL = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'Tous' && value !== 'all') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    router.push(`/recherche?${newParams.toString()}`, { scroll: false });
  };

  // Build API params
  const apiParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    };

    if (searchQuery) params.q = searchQuery;
    // Support multiple types (for "Commerces" = BUREAU,MAGASIN)
    if (selectedTypes.length > 0) {
      params.type_bien = selectedTypes.join(',');
    } else if (selectedType !== 'Tous') {
      params.type_bien = selectedType;
    }
    if (selectedQuartier !== 'Tous') {
      // Include nearby quartiers in the search
      const nearby = getNearbyQuartiers(selectedQuartier, 5);
      const allQuartiers = [selectedQuartier, ...nearby];
      params.quartier = allQuartiers.join(',');
    }
    // Don't filter by commune when searching by quartier (to include nearby quartiers)
    if (selectedCommune !== 'Tous' && selectedQuartier === 'Tous') params.commune = selectedCommune;
    if (transactionType !== 'all') params.type_transaction = transactionType;

    const priceRange = priceRanges[selectedPriceRange];
    if (priceRange.min > 0) params.prix_min = priceRange.min;
    if (priceRange.max > 0) params.prix_max = priceRange.max;

    // Sort - backend expects sort_by and sort_order
    switch (selectedSort) {
      case 'price_asc':
        params.sort_by = 'prix';
        params.sort_order = 'asc';
        break;
      case 'price_desc':
        params.sort_by = 'prix';
        params.sort_order = 'desc';
        break;
      case 'area':
        params.sort_by = 'surface_m2';
        params.sort_order = 'desc';
        break;
      default:
        params.sort_by = 'created_at';
        params.sort_order = 'desc';
    }

    return params;
  }, [searchQuery, selectedType, selectedTypes, selectedQuartier, selectedCommune, selectedPriceRange, selectedSort, transactionType, currentPage]);

  // Fetch listings from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['listings', 'search', apiParams],
    queryFn: async () => {
      const response = await api.listings.list(apiParams);
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const listings: Listing[] = data?.listings || [];
  const pagination = data?.pagination || { current_page: 1, last_page: 1, total: 0 };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedTypes, selectedQuartier, selectedCommune, selectedPriceRange, selectedSort, transactionType]);

  // Sync URL params on initial load
  useEffect(() => {
    const q = searchParams.get('q');
    const type = searchParams.get('type_bien');
    const quartier = searchParams.get('quartier');
    const commune = searchParams.get('commune');
    const transaction = searchParams.get('type_transaction');
    const premium = searchParams.get('premium');

    if (q) setSearchQuery(q);
    if (type) setSelectedType(type);
    if (quartier) setSelectedQuartier(quartier);
    if (commune) setSelectedCommune(commune);
    if (transaction) setTransactionType(transaction as 'LOCATION' | 'VENTE');
  }, []);

  const activeFiltersCount = [
    selectedType !== 'Tous',
    selectedQuartier !== 'Tous',
    selectedCommune !== 'Tous',
    selectedPriceRange !== 0,
    transactionType !== 'all',
  ].filter(Boolean).length;

  // Get unique quartiers from communes data
  const quartiersWithTous = ['Tous', ...CONAKRY_COMMUNES];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      {/* Search Header */}
      <div className="sticky top-14 md:top-16 z-30 bg-white dark:bg-dark-card shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Selected Quartier Badge */}
          {selectedQuartier !== 'Tous' && (
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">
                <MapPin className="w-4 h-4" />
                {selectedQuartier}
                {selectedCommune !== 'Tous' && `, ${selectedCommune}`}
                <button
                  onClick={() => {
                    setSelectedQuartier('Tous');
                    setSelectedCommune('Tous');
                    setQuartierSearchInput('');
                    updateURL({ quartier: null, commune: null });
                  }}
                  className="ml-1 p-0.5 hover:bg-primary-200 dark:hover:bg-primary-500/30 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          )}

          {/* Quartier Search with Autocomplete */}
          <div className="relative mb-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl shadow-sm">
                <MapPin className="w-5 h-5 text-primary-500" />
                <input
                  type="text"
                  value={quartierSearchInput}
                  onChange={(e) => {
                    setQuartierSearchInput(e.target.value);
                    setShowQuartierDropdown(true);
                  }}
                  onFocus={() => setShowQuartierDropdown(true)}
                  placeholder="Rechercher un quartier (ex: Kipé, Madina...)"
                  className="flex-1 bg-transparent focus:outline-none text-neutral-900 dark:text-white"
                />
                {quartierSearchInput && (
                  <button onClick={() => {
                    setQuartierSearchInput('');
                    setShowQuartierDropdown(false);
                  }}>
                    <X className="w-4 h-4 text-neutral-400 hover:text-neutral-600" />
                  </button>
                )}
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`relative p-3 rounded-xl transition-colors ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 dark:bg-dark-bg text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <SlidersHorizontal className="w-5 h-5" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </motion.button>
            </div>

            {/* Quartier Autocomplete Dropdown */}
            <AnimatePresence>
              {showQuartierDropdown && filteredQuartiers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl shadow-lg z-50 overflow-hidden"
                >
                  {filteredQuartiers.map((quartier) => (
                    <button
                      key={quartier.name}
                      onClick={() => {
                        setSelectedQuartier(quartier.name);
                        setSelectedCommune(quartier.commune);
                        setQuartierSearchInput('');
                        setShowQuartierDropdown(false);
                        updateURL({ quartier: quartier.name, commune: quartier.commune });
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-dark-border transition-colors flex items-center gap-3"
                    >
                      <MapPin className="w-4 h-4 text-neutral-400" />
                      <div>
                        <span className="font-medium text-neutral-900 dark:text-white">{quartier.name}</span>
                        <span className="text-sm text-neutral-500 ml-2">{quartier.commune}</span>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Click outside to close dropdown */}
            {showQuartierDropdown && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowQuartierDropdown(false)}
              />
            )}
          </div>

          {/* Transaction Type Toggle */}
          <div className="flex gap-2 mb-4">
            {[
              { value: 'all', label: 'Tous' },
              { value: 'LOCATION', label: 'Location' },
              { value: 'VENTE', label: 'Vente' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setTransactionType(option.value as typeof transactionType);
                  updateURL({ type_transaction: option.value === 'all' ? null : option.value });
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  transactionType === option.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 dark:bg-dark-bg text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Quick Filters - Property Types */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {propertyTypes.map((type) => (
              <FilterChip
                key={type}
                label={propertyTypeLabels[type] || type}
                isActive={selectedType === type}
                onClick={() => {
                  setSelectedType(type);
                  updateURL({ type_bien: type === 'Tous' ? null : type });
                }}
              />
            ))}
          </div>
        </div>

        {/* Extended Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-neutral-200 dark:border-dark-border overflow-hidden"
            >
              <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
                {/* Commune */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Commune
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {quartiersWithTous.map((commune) => (
                      <FilterChip
                        key={commune}
                        label={commune}
                        isActive={selectedCommune === commune}
                        onClick={() => {
                          setSelectedCommune(commune);
                          updateURL({ commune: commune === 'Tous' ? null : commune });
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Budget
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {priceRanges.map((range, index) => (
                      <FilterChip
                        key={range.label}
                        label={range.label}
                        isActive={selectedPriceRange === index}
                        onClick={() => setSelectedPriceRange(index)}
                      />
                    ))}
                  </div>
                </div>

                {/* Reset Filters */}
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      setSelectedType('Tous');
                      setSelectedQuartier('Tous');
                      setSelectedCommune('Tous');
                      setSelectedPriceRange(0);
                      setTransactionType('all');
                      setSearchQuery('');
                      router.push('/recherche');
                    }}
                    className="text-primary-500 text-sm font-medium"
                  >
                    Reinitialiser les filtres
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-neutral-600 dark:text-neutral-400">
            <span className="font-semibold text-neutral-900 dark:text-white">{pagination.total}</span> bien(s) trouve(s)
          </p>

          <div className="flex items-center gap-3">
            {/* Sort */}
            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 dark:text-white"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>

            {/* View Toggle */}
            <div className="hidden sm:flex items-center bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary-500 text-white'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary-500 text-white'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-16">
            <p className="text-red-500">Erreur lors du chargement des annonces</p>
          </div>
        )}

        {/* Property Grid/List */}
        {!isLoading && !error && listings.length > 0 && (
          <>
            {/* If quartier is selected, separate exact matches from nearby */}
            {selectedQuartier !== 'Tous' ? (
              <>
                {/* Exact quartier listings */}
                {(() => {
                  const exactListings = listings.filter(
                    p => normalizeString(p.quartier) === normalizeString(selectedQuartier)
                  );
                  const nearbyListings = listings.filter(
                    p => normalizeString(p.quartier) !== normalizeString(selectedQuartier)
                  );

                  return (
                    <>
                      {/* Exact quartier section */}
                      {exactListings.length > 0 && (
                        <div className="mb-8">
                          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary-500" />
                            A {selectedQuartier}
                            <span className="text-sm font-normal text-neutral-500">({exactListings.length})</span>
                          </h2>
                          <div
                            className={
                              viewMode === 'grid'
                                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                                : 'space-y-4'
                            }
                          >
                            {exactListings.map((property) => (
                              <PropertyCard key={property.id} property={property} viewMode={viewMode} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Nearby quartiers section */}
                      {nearbyListings.length > 0 && (
                        <div>
                          <div className="border-t border-neutral-200 dark:border-dark-border my-6" />
                          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            Quartiers a proximite
                            <span className="text-sm font-normal text-neutral-500">({nearbyListings.length})</span>
                          </h2>
                          <div
                            className={
                              viewMode === 'grid'
                                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                                : 'space-y-4'
                            }
                          >
                            {nearbyListings.map((property) => (
                              <PropertyCard key={property.id} property={property} viewMode={viewMode} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No exact matches but has nearby */}
                      {exactListings.length === 0 && nearbyListings.length > 0 && (
                        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                          <p className="text-amber-800 dark:text-amber-200 text-sm">
                            Aucune annonce trouvee a {selectedQuartier}. Voici des biens dans les quartiers a proximite.
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            ) : (
              /* No quartier selected - show all listings */
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                    : 'space-y-4'
                }
              >
                {listings.map((property) => (
                  <PropertyCard key={property.id} property={property} viewMode={viewMode} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!isLoading && !error && listings.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 bg-neutral-100 dark:bg-dark-card rounded-full flex items-center justify-center">
              <Search className="w-10 h-10 text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              Aucun resultat
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 mb-4">
              Essayez de modifier vos criteres de recherche
            </p>
            <button
              onClick={() => {
                setSelectedType('Tous');
                setSelectedQuartier('Tous');
                setSelectedCommune('Tous');
                setSelectedPriceRange(0);
                setTransactionType('all');
                setSearchQuery('');
                router.push('/recherche');
              }}
              className="px-6 py-2 bg-primary-500 text-white rounded-xl font-medium"
            >
              Reinitialiser les filtres
            </button>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && pagination.last_page > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-lg disabled:opacity-50"
            >
              Precedent
            </button>
            <span className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
              Page {currentPage} sur {pagination.last_page}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(pagination.last_page, p + 1))}
              disabled={currentPage === pagination.last_page}
              className="px-4 py-2 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-lg disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Main page with Suspense boundary
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
