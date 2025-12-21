'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Heart,
  Share2,
  MapPin,
  Bed,
  Bath,
  Square,
  Zap,
  Droplets,
  Shield,
  Car,
  Wifi,
  Wind,
  Check,
  X,
  Phone,
  MessageSquare,
  Calendar,
  Star,
  ChevronRight,
  Mic,
  Send,
  Clock,
  Eye,
  Loader2,
  AlertCircle,
  Home,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';

// Action names for verification messages
const VERIFICATION_ACTIONS = {
  contact: 'contacter le propriétaire',
  favorite: 'ajouter aux favoris',
  booking: 'programmer une visite',
};

// Types
interface ListingPhoto {
  id: string;
  url: string;
  thumbnail_url: string | null;
  medium_url: string | null;
  large_url: string | null;
  is_primary: boolean;
}

interface ListingUser {
  id: string;
  nom_complet: string;
  badge: string;
  telephone_verified_at: string | null;
  statut_verification: string;
}

interface Listing {
  id: string;
  titre: string;
  description: string;
  type_bien: string;
  quartier: string;
  commune: string;
  adresse_complete: string | null;
  loyer_mensuel: string;
  caution: string;
  nombre_chambres: number | null;
  nombre_salles_bain: number | null;
  surface_m2: number | null;
  meuble: boolean;
  commodites: string[] | string | null;
  photo_principale: string | null;
  main_photo_url: string;
  formatted_price: string;
  statut: string;
  disponible: boolean;
  vues_count: number;
  created_at: string;
  user: ListingUser;
  listing_photos: ListingPhoto[];
}

// Format price
const formatPrice = (price: string | number) => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('fr-GN').format(num) + ' GNF';
};

// Map property type to French
const getPropertyTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    'APPARTEMENT': 'Appartement',
    'MAISON': 'Maison',
    'VILLA': 'Villa',
    'STUDIO': 'Studio',
    'TERRAIN': 'Terrain',
    'COMMERCIAL': 'Commercial',
    'BUREAU': 'Bureau',
    'ENTREPOT': 'Entrepot',
  };
  return types[type] || type;
};

// Map amenity to icon and label
const amenityConfig: Record<string, { icon: React.ElementType; label: string }> = {
  'wifi': { icon: Wifi, label: 'WiFi' },
  'climatisation': { icon: Wind, label: 'Climatisation' },
  'parking': { icon: Car, label: 'Parking' },
  'garage': { icon: Car, label: 'Garage' },
  'securite': { icon: Shield, label: 'Sécurité' },
  'gardien': { icon: Shield, label: 'Gardien' },
  'piscine': { icon: Droplets, label: 'Piscine' },
  'eau_courante': { icon: Droplets, label: 'Eau courante' },
  'electricite': { icon: Zap, label: 'Électricité' },
  'groupe_electrogene': { icon: Zap, label: 'Groupe électrogène' },
  'jardin': { icon: Home, label: 'Jardin' },
  'meuble': { icon: Home, label: 'Meublé' },
  'ascenseur': { icon: Home, label: 'Ascenseur' },
};

// Amenity Item Component
function AmenityItem({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-dark-card">
      <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-500/10">
        <Icon className="w-5 h-5 text-primary-500" />
      </div>
      <span className="font-medium text-neutral-900 dark:text-white">{label}</span>
      <Check className="w-5 h-5 text-emerald-500 ml-auto" />
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg animate-pulse">
      <div className="h-64 md:h-96 bg-neutral-200 dark:bg-neutral-800" />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4 mb-4" />
        <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2 mb-4" />
        <div className="h-10 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3 mb-6" />
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          ))}
        </div>
        <div className="h-48 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
      </div>
    </div>
  );
}

// Error display
function ErrorDisplay({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex items-center justify-center">
      <div className="text-center px-4">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
          Erreur de chargement
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">{message}</p>
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { isAuthenticated, user, requirePhoneVerification, hasVerifiedPhone } = useAuth();

  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Fetch listing data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const response = await api.listings.get(id);
      return response.data;
    },
    enabled: !!id,
  });

  // Fetch similar listings
  const { data: similarData } = useQuery({
    queryKey: ['similar-listings', id],
    queryFn: async () => {
      const response = await api.listings.similar(id);
      return response.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !data?.data?.listing) {
    return (
      <ErrorDisplay
        message="Impossible de charger cette annonce"
        onRetry={() => refetch()}
      />
    );
  }

  const listing: Listing = data.data.listing;
  const similarListings = similarData?.data?.listings || [];

  // Check if current user is the owner of this listing
  const isOwner = user?.id === listing.user_id || user?.id === listing.user?.id;

  // Get images array
  const images = listing.listing_photos?.length > 0
    ? listing.listing_photos.map(p => p.medium_url || p.url)
    : listing.photo_principale
      ? [listing.photo_principale]
      : ['/images/placeholder.jpg'];

  // Get amenities - handle both array and JSON string formats
  const amenities: string[] = (() => {
    if (!listing.commodites) return [];
    if (Array.isArray(listing.commodites)) return listing.commodites;
    if (typeof listing.commodites === 'string') {
      try {
        const parsed = JSON.parse(listing.commodites);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  })();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg pb-24">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-14 left-0 right-0 z-30 bg-white/95 dark:bg-dark-card/95 backdrop-blur-md border-b border-neutral-200 dark:border-dark-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/recherche" className="p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-full">
            <ChevronLeft className="w-6 h-6 text-neutral-700 dark:text-white" />
          </Link>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-full">
              <Share2 className="w-5 h-5 text-neutral-700 dark:text-white" />
            </button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (!isAuthenticated) {
                  router.push(`/auth/login?redirect=/bien/${id}`);
                  return;
                }
                if (!requirePhoneVerification(VERIFICATION_ACTIONS.favorite)) return;
                setIsFavorite(!isFavorite);
                // TODO: Call API to toggle favorite
              }}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-bg rounded-full"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-neutral-700 dark:text-white'}`} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="relative">
        {/* Mobile Swipeable Carousel */}
        <div className="md:hidden relative">
          <div
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            onScroll={(e) => {
              const container = e.currentTarget;
              const scrollLeft = container.scrollLeft;
              const itemWidth = container.offsetWidth;
              const newIndex = Math.round(scrollLeft / itemWidth);
              if (newIndex !== currentImageIndex && newIndex >= 0 && newIndex < images.length) {
                setCurrentImageIndex(newIndex);
              }
            }}
          >
            {images.map((img, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-full h-72 snap-center relative bg-neutral-200 dark:bg-neutral-800"
                onClick={() => setShowGallery(true)}
              >
                {img && img !== '/images/placeholder.jpg' ? (
                  <Image
                    src={img}
                    alt={`${listing.titre} - Photo ${index + 1}`}
                    fill
                    className="object-cover"
                    priority={index === 0}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Home className="w-16 h-16 text-neutral-400" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Navigation dots */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {images.slice(0, 7).map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentImageIndex ? 'bg-white w-6' : 'bg-white/50 w-2'
                  }`}
                />
              ))}
              {images.length > 7 && (
                <div className="h-2 w-2 rounded-full bg-white/50" />
              )}
            </div>
          )}

          {/* Image count */}
          <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm z-10">
            {currentImageIndex + 1}/{images.length}
          </div>

          {/* Status Badge */}
          {listing.statut === 'BROUILLON' && (
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-amber-500 text-white text-sm font-semibold rounded-full z-10">
              Brouillon
            </div>
          )}
        </div>

        {/* Desktop Main Image */}
        <div
          className="hidden md:block relative h-96 bg-neutral-200 dark:bg-neutral-800 cursor-pointer overflow-hidden"
          onClick={() => setShowGallery(true)}
        >
          {images[currentImageIndex] && images[currentImageIndex] !== '/images/placeholder.jpg' ? (
            <Image
              src={images[currentImageIndex]}
              alt={listing.titre}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Home className="w-16 h-16 text-neutral-400" />
            </div>
          )}

          {/* Image count */}
          <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm">
            {currentImageIndex + 1}/{images.length}
          </div>

          {/* Status Badge */}
          {listing.statut === 'BROUILLON' && (
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-amber-500 text-white text-sm font-semibold rounded-full">
              Brouillon
            </div>
          )}
        </div>

        {/* Desktop Image Grid */}
        {images.length > 1 && (
          <div className="hidden md:grid md:grid-cols-4 gap-2 mt-2 max-w-7xl mx-auto px-4">
            {images.slice(1, 5).map((img, index) => (
              <div
                key={index}
                onClick={() => {
                  setCurrentImageIndex(index + 1);
                  setShowGallery(true);
                }}
                className="relative aspect-video bg-neutral-200 dark:bg-neutral-800 rounded-xl cursor-pointer overflow-hidden group"
              >
                {img && img !== '/images/placeholder.jpg' ? (
                  <Image src={img} alt={`Photo ${index + 2}`} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Home className="w-8 h-8 text-neutral-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                {index === 3 && images.length > 5 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-semibold">+{images.length - 5} photos</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-3 py-1 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-sm font-medium rounded-lg">
                  {getPropertyTypeLabel(listing.type_bien)}
                </span>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 text-sm font-medium rounded-lg">
                  À louer
                </span>
                {listing.user?.statut_verification === 'VERIFIE' && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-lg">
                    <Check className="w-4 h-4" />
                    Vérifié
                  </span>
                )}
                {listing.meuble && (
                  <span className="px-3 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-sm font-medium rounded-lg">
                    Meublé
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                {listing.titre}
              </h1>

              <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 mb-4">
                <MapPin className="w-5 h-5" />
                <span>
                  {listing.adresse_complete || `${listing.quartier}, ${listing.commune}`}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-bold text-primary-500">
                  {listing.formatted_price || formatPrice(listing.loyer_mensuel)}
                </span>
                {(listing.type_transaction === 'LOCATION' || listing.type_transaction === 'location') && (
                  <span className="text-lg text-neutral-500">/mois</span>
                )}
                {(listing.type_transaction === 'LOCATION_COURTE' || listing.type_transaction === 'location_courte') && (
                  <span className="text-lg text-purple-500">/jour</span>
                )}
                {!listing.type_transaction && <span className="text-lg text-neutral-500">/mois</span>}
              </div>

              {(listing.type_transaction === 'LOCATION_COURTE' || listing.type_transaction === 'location_courte') && listing.duree_minimum_jours && (
                <p className="text-sm text-purple-600 mt-1">
                  Durée minimum: {listing.duree_minimum_jours} jour{listing.duree_minimum_jours > 1 ? 's' : ''}
                </p>
              )}

              {listing.caution && parseFloat(listing.caution) > 0 && (
                <p className="text-sm text-neutral-500 mt-1">
                  Caution: {formatPrice(listing.caution)}
                </p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Bed, label: 'Chambres', value: listing.nombre_chambres ?? '-' },
                { icon: Bath, label: 'Salles de bain', value: listing.nombre_salles_bain ?? '-' },
                { icon: Square, label: 'Surface', value: listing.surface_m2 ? `${listing.surface_m2} m²` : '-' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white dark:bg-dark-card rounded-xl p-4 text-center">
                  <stat.icon className="w-6 h-6 text-primary-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Description
              </h2>
              <p className="text-neutral-600 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
                {listing.description}
              </p>
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="bg-white dark:bg-dark-card rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                  Équipements & Commodités
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {amenities.map((amenity) => {
                    const config = amenityConfig[amenity.toLowerCase()] || { icon: Check, label: amenity };
                    return (
                      <AmenityItem
                        key={amenity}
                        icon={config.icon}
                        label={config.label}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="bg-white dark:bg-dark-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Localisation
              </h2>
              <div className="aspect-video bg-neutral-100 dark:bg-dark-bg rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
                  <p className="text-neutral-500">Carte interactive</p>
                  <p className="text-sm text-neutral-400">{listing.quartier}, {listing.commune}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Owner Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {/* Owner Card */}
              <div className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold">
                    {listing.user?.nom_complet?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-neutral-900 dark:text-white">
                        {listing.user?.nom_complet || 'Propriétaire'}
                      </h3>
                      {listing.user?.statut_verification === 'VERIFIE' && (
                        <Check className="w-5 h-5 text-emerald-500" />
                      )}
                    </div>
                    {listing.user?.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        listing.user.badge === 'DIAMANT' ? 'bg-purple-100 text-purple-700' :
                        listing.user.badge === 'OR' ? 'bg-amber-100 text-amber-700' :
                        listing.user.badge === 'ARGENT' ? 'bg-gray-100 text-gray-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {listing.user.badge}
                      </span>
                    )}
                  </div>
                </div>

                {!isOwner ? (
                  <div className="space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (!isAuthenticated) {
                          router.push(`/auth/login?redirect=/bien/${id}`);
                          return;
                        }
                        if (!requirePhoneVerification(VERIFICATION_ACTIONS.contact)) return;
                        setShowContactModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors"
                    >
                      <Phone className="w-5 h-5" />
                      Contacter
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (!isAuthenticated) {
                          router.push(`/auth/login?redirect=/bien/${id}`);
                          return;
                        }
                        if (!requirePhoneVerification(VERIFICATION_ACTIONS.booking)) return;
                        setShowBookingModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 border-2 border-primary-500 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 font-semibold rounded-xl transition-colors"
                    >
                      <Calendar className="w-5 h-5" />
                      Programmer une visite
                    </motion.button>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Ceci est votre annonce
                    </p>
                  </div>
                )}
              </div>

              {/* Property Stats */}
              <div className="bg-white dark:bg-dark-card rounded-2xl p-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-neutral-500">
                    <Eye className="w-4 h-4" />
                    <span>{listing.vues_count || 0} vues</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-500">
                    <Clock className="w-4 h-4" />
                    <span>Publié le {new Date(listing.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Properties */}
        {similarListings.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">
              Biens similaires
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarListings.map((prop: any) => (
                <Link key={prop.id} href={`/bien/${prop.id}`}>
                  <motion.div
                    whileHover={{ y: -5 }}
                    className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
                  >
                    <div className="relative aspect-video bg-neutral-200 dark:bg-neutral-800">
                      {prop.photo_principale ? (
                        <Image src={prop.photo_principale} alt={prop.titre} fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Home className="w-8 h-8 text-neutral-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-neutral-900 dark:text-white mb-1 truncate">
                        {prop.titre}
                      </h3>
                      <p className="text-sm text-neutral-500 mb-2">{prop.quartier}, {prop.commune}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary-500">
                          {prop.formatted_price || formatPrice(prop.loyer_mensuel)}/mois
                        </span>
                        <span className="text-sm text-neutral-500">
                          {prop.nombre_chambres || '-'} ch. {prop.surface_m2 ? `• ${prop.surface_m2} m²` : ''}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Fixed Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-card border-t border-neutral-200 dark:border-dark-border p-4 z-40">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-2xl font-bold text-primary-500">
              {listing.formatted_price || formatPrice(listing.loyer_mensuel)}
              {(listing.type_transaction === 'LOCATION' || listing.type_transaction === 'location' || !listing.type_transaction) && (
                <span className="text-sm font-normal text-neutral-500">/mois</span>
              )}
              {(listing.type_transaction === 'LOCATION_COURTE' || listing.type_transaction === 'location_courte') && (
                <span className="text-sm font-normal text-purple-500">/jour</span>
              )}
            </p>
          </div>
          {!isOwner ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (!isAuthenticated) {
                  router.push(`/auth/login?redirect=/bien/${id}`);
                  return;
                }
                if (!requirePhoneVerification(VERIFICATION_ACTIONS.contact)) return;
                setShowContactModal(true);
              }}
              className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl"
            >
              Contacter
            </motion.button>
          ) : (
            <span className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              Votre annonce
            </span>
          )}
        </div>
      </div>

      {/* Gallery Modal - Fullscreen */}
      <AnimatePresence>
        {showGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50"
          >
            {/* Close button */}
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={() => setShowGallery(false)}
                className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Mobile: Swipeable fullscreen carousel */}
            <div className="md:hidden h-full">
              <div
                className="flex h-full overflow-x-auto snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                onScroll={(e) => {
                  const container = e.currentTarget;
                  const scrollLeft = container.scrollLeft;
                  const itemWidth = container.offsetWidth;
                  const newIndex = Math.round(scrollLeft / itemWidth);
                  if (newIndex !== currentImageIndex && newIndex >= 0 && newIndex < images.length) {
                    setCurrentImageIndex(newIndex);
                  }
                }}
              >
                {images.map((img, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-full h-full snap-center flex items-center justify-center"
                  >
                    {img && img !== '/images/placeholder.jpg' ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={img}
                          alt={`Photo ${index + 1}`}
                          fill
                          className="object-contain"
                          priority={index === currentImageIndex}
                        />
                      </div>
                    ) : (
                      <Home className="w-16 h-16 text-neutral-600" />
                    )}
                  </div>
                ))}
              </div>

              {/* Mobile navigation dots */}
              {images.length > 1 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                  {images.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentImageIndex ? 'bg-white w-6' : 'bg-white/40 w-2'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Image count */}
              <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm z-10">
                {currentImageIndex + 1} / {images.length}
              </div>
            </div>

            {/* Desktop: Centered image with navigation arrows */}
            <div className="hidden md:flex h-full items-center justify-center">
              {/* Left arrow */}
              {images.length > 1 && (
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-4 p-4 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors z-10"
                >
                  <ChevronLeft className="w-8 h-8 text-white" />
                </button>
              )}

              {/* Main image */}
              <div className="relative w-full h-full max-w-6xl max-h-[85vh] mx-16">
                {images[currentImageIndex] && images[currentImageIndex] !== '/images/placeholder.jpg' ? (
                  <Image
                    src={images[currentImageIndex]}
                    alt={`Photo ${currentImageIndex + 1}`}
                    fill
                    className="object-contain"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Home className="w-16 h-16 text-neutral-600" />
                  </div>
                )}
              </div>

              {/* Right arrow */}
              {images.length > 1 && (
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                  className="absolute right-4 p-4 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors z-10"
                >
                  <ChevronRight className="w-8 h-8 text-white" />
                </button>
              )}

              {/* Desktop counter and thumbnails */}
              {images.length > 1 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-10">
                  {/* Thumbnail strip */}
                  <div className="flex gap-2">
                    {images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`relative w-16 h-12 rounded-lg overflow-hidden transition-all ${
                          index === currentImageIndex ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        {img && img !== '/images/placeholder.jpg' ? (
                          <Image src={img} alt={`Thumbnail ${index + 1}`} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-neutral-700 flex items-center justify-center">
                            <Home className="w-4 h-4 text-neutral-500" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <span className="text-white font-medium">
                    {currentImageIndex + 1} / {images.length}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Modal */}
      <AnimatePresence>
        {showContactModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
            onClick={() => setShowContactModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full md:w-auto md:min-w-[450px] bg-white dark:bg-dark-card rounded-t-3xl md:rounded-2xl p-6"
            >
              <div className="w-12 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full mx-auto mb-6 md:hidden" />

              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2 text-center">
                Contacter le proprietaire
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-6">
                Envoyez un message a {listing.user?.nom_complet || 'proprietaire'}
              </p>

              {!isAuthenticated ? (
                <div className="text-center py-4">
                  <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                    Connectez-vous pour envoyer un message
                  </p>
                  <Link href={`/connexion?redirect=/bien/${listing.id}`}>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl"
                    >
                      Se connecter
                    </motion.button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Quick message suggestions */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Bonjour, ce bien est-il toujours disponible ?',
                      'Je souhaite programmer une visite',
                      'Quelles sont les conditions de location ?',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setContactMessage(suggestion)}
                        className="px-3 py-1.5 text-xs bg-neutral-100 dark:bg-dark-bg text-neutral-600 dark:text-neutral-400 rounded-full hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-500/10 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>

                  {/* Message input */}
                  <div>
                    <textarea
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Ecrivez votre message..."
                      rows={4}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white resize-none"
                    />
                  </div>

                  {/* Send button */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      if (!contactMessage.trim()) {
                        toast.error('Veuillez ecrire un message');
                        return;
                      }
                      setIsSendingMessage(true);
                      try {
                        const response = await api.messaging.startConversation({
                          listing_id: listing.id,
                          message: contactMessage.trim(),
                        });
                        if (response.data?.success) {
                          toast.success('Message envoye avec succes !');
                          setShowContactModal(false);
                          setContactMessage('');
                          // Redirect to messages page
                          router.push('/messages');
                        } else {
                          throw new Error(response.data?.message || 'Erreur');
                        }
                      } catch (error: any) {
                        console.error('Error sending message:', error);
                        const errorMessage = error.response?.data?.message || 'Erreur lors de l\'envoi du message';
                        toast.error(errorMessage);
                      } finally {
                        setIsSendingMessage(false);
                      }
                    }}
                    disabled={isSendingMessage || !contactMessage.trim()}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                  >
                    {isSendingMessage ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Envoyer le message
                      </>
                    )}
                  </motion.button>
                </div>
              )}

              <button
                onClick={() => {
                  setShowContactModal(false);
                  setContactMessage('');
                }}
                className="w-full mt-4 py-3 text-neutral-500 font-medium"
              >
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Modal */}
      <AnimatePresence>
        {showBookingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
            onClick={() => setShowBookingModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full md:w-auto md:min-w-[400px] bg-white dark:bg-dark-card rounded-t-3xl md:rounded-2xl p-6"
            >
              <div className="w-12 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full mx-auto mb-6 md:hidden" />

              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-6 text-center">
                Programmer une visite
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Date souhaitée
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Créneau horaire
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((time) => (
                      <button
                        key={time}
                        className="px-4 py-2 border border-neutral-200 dark:border-dark-border rounded-lg text-sm hover:border-primary-500 hover:text-primary-500 transition-colors dark:text-white"
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Message (optionnel)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Questions ou précisions..."
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white resize-none"
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-6 py-4 bg-primary-500 text-white font-semibold rounded-xl"
                >
                  Envoyer la demande
                </motion.button>
              </div>

              <button
                onClick={() => setShowBookingModal(false)}
                className="w-full mt-4 py-3 text-neutral-500 font-medium"
              >
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
