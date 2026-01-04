'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';

// Dynamically import map component to avoid SSR issues
const MapView = dynamic(() => import('@/app/(public)/annonces/[id]/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-dark-bg rounded-xl">
      <div className="text-neutral-500">Chargement de la carte...</div>
    </div>
  ),
});
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
  Send,
  Clock,
  Eye,
  Loader2,
  AlertCircle,
  Home,
  Grid3X3,
  Users,
  Sofa,
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
  nombre_salons: number | null;
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
  type_transaction?: string;
  duree_minimum_jours?: number;
  user_id?: string;
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
    'ENTREPOT': 'Entrepôt',
    'CHAMBRE_SALON': 'Chambre-Salon',
    'DUPLEX': 'Duplex',
    'MAGASIN': 'Magasin',
  };
  return types[type] || type;
};

// Map amenity to icon and label
const amenityConfig: Record<string, { icon: React.ElementType; label: string }> = {
  'wifi': { icon: Wifi, label: 'WiFi' },
  'climatisation': { icon: Wind, label: 'Climatisation' },
  'parking': { icon: Car, label: 'Parking' },
  'garage': { icon: Car, label: 'Garage' },
  'securite': { icon: Shield, label: 'Sécurité 24h' },
  'gardien': { icon: Shield, label: 'Gardien' },
  'piscine': { icon: Droplets, label: 'Piscine' },
  'eau_courante': { icon: Droplets, label: 'Eau courante' },
  'electricite': { icon: Zap, label: 'Électricité' },
  'groupe_electrogene': { icon: Zap, label: 'Groupe électrogène' },
  'jardin': { icon: Home, label: 'Jardin' },
  'meuble': { icon: Sofa, label: 'Meublé' },
  'ascenseur': { icon: Home, label: 'Ascenseur' },
  'balcon': { icon: Home, label: 'Balcon' },
  'cuisine': { icon: Home, label: 'Cuisine équipée' },
  'forage': { icon: Droplets, label: 'Forage' },
  'seg_uniquement': { icon: Droplets, label: 'SEG uniquement' },
};

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[400px] md:h-[500px] rounded-xl overflow-hidden">
          <div className="md:col-span-2 md:row-span-2 bg-neutral-200 dark:bg-neutral-800" />
          <div className="hidden md:block bg-neutral-200 dark:bg-neutral-800" />
          <div className="hidden md:block bg-neutral-200 dark:bg-neutral-800" />
          <div className="hidden md:block bg-neutral-200 dark:bg-neutral-800" />
          <div className="hidden md:block bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
    </div>
  );
}

// Error display
function ErrorDisplay({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg flex items-center justify-center">
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
  const { isAuthenticated, user, requirePhoneVerification } = useAuth();

  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryPage, setGalleryPage] = useState(0); // For grid pagination
  const [showContactModal, setShowContactModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false);

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

  // Handle visit booking submission
  const handleSubmitVisit = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/bien/${id}`);
      return;
    }

    if (!visitDate || !visitTime) {
      toast.error('Veuillez sélectionner une date et un créneau horaire');
      return;
    }

    setIsSubmittingVisit(true);
    try {
      await api.visits.create({
        listing_id: id,
        client_nom: user?.nom_complet || 'Client',
        client_telephone: user?.telephone || '',
        client_email: user?.email || undefined,
        date_visite: visitDate,
        heure_visite: visitTime,
        notes: visitNotes || undefined,
      });

      toast.success('Demande de visite envoyée avec succès !');
      setShowBookingModal(false);
      setVisitDate('');
      setVisitTime('');
      setVisitNotes('');
    } catch (error: unknown) {
      console.error('Error submitting visit:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'envoi de la demande';
      toast.error(errorMessage);
    } finally {
      setIsSubmittingVisit(false);
    }
  };

  // Share functionality
  const handleShare = async () => {
    const shareData = {
      title: listing?.titre || 'Bien immobilier',
      text: `Découvrez ce bien: ${listing?.titre}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié dans le presse-papier');
    }
  };

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

  // Get images array (filter out empty/placeholder images)
  const images = (() => {
    if (listing.listing_photos?.length > 0) {
      return listing.listing_photos
        .map(p => p.large_url || p.medium_url || p.url)
        .filter(url => url && url !== '/images/placeholder.jpg');
    }
    if (listing.photo_principale) {
      return [listing.photo_principale];
    }
    return ['/images/placeholder.jpg']; // Only use placeholder if no images at all
  })();

  // Get amenities
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

  // Get transaction type label
  const getTransactionLabel = () => {
    if (listing.type_transaction === 'VENTE' || listing.type_transaction === 'vente') {
      return 'À vendre';
    }
    if (listing.type_transaction === 'LOCATION_COURTE' || listing.type_transaction === 'location_courte') {
      return 'Location courte durée';
    }
    return 'À louer';
  };

  // Get price suffix
  const getPriceSuffix = () => {
    if (listing.type_transaction === 'VENTE' || listing.type_transaction === 'vente') {
      return '';
    }
    if (listing.type_transaction === 'LOCATION_COURTE' || listing.type_transaction === 'location_courte') {
      return ' /nuit';
    }
    return ' /mois';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg">
      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24">
        {/* Header: Title + Share/Save */}
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-white pr-4">
            {listing.titre}
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-dark-card rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium underline">Partager</span>
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  router.push(`/auth/login?redirect=/bien/${id}`);
                  return;
                }
                if (!requirePhoneVerification(VERIFICATION_ACTIONS.favorite)) return;
                setIsFavorite(!isFavorite);
              }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-dark-card rounded-lg transition-colors"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              <span className="hidden sm:inline text-sm font-medium underline">Enregistrer</span>
            </button>
          </div>
        </div>

        {/* Dynamic Photo Gallery Grid */}
        {(() => {
          const hasPlaceholder = images.length === 1 && images[0] === '/images/placeholder.jpg';
          const totalImages = hasPlaceholder ? 0 : images.length;
          const imagesPerPage = 5; // 1 main + 4 side
          const totalPages = totalImages > 0 ? Math.ceil(totalImages / imagesPerPage) : 1;
          const startIndex = galleryPage * imagesPerPage;
          const currentImages = hasPlaceholder ? images : images.slice(startIndex, startIndex + imagesPerPage);
          const sideImagesCount = Math.min(currentImages.length - 1, 4); // Max 4 side images

          // Determine grid layout based on available images
          const getGridClass = () => {
            if (totalImages <= 1) return 'grid-cols-1';
            if (totalImages === 2) return 'grid-cols-1 md:grid-cols-2';
            if (totalImages === 3) return 'grid-cols-1 md:grid-cols-3';
            if (totalImages === 4) return 'grid-cols-1 md:grid-cols-4';
            return 'grid-cols-1 md:grid-cols-4 md:grid-rows-2';
          };

          return (
            <div
              className={`relative grid ${getGridClass()} gap-2 rounded-xl overflow-hidden cursor-pointer group`}
              style={{ height: 'clamp(300px, 50vw, 500px)' }}
              onClick={() => {
                setCurrentImageIndex(startIndex);
                setShowGallery(true);
              }}
            >
              {/* Main large image */}
              <div className={`relative bg-neutral-200 dark:bg-neutral-800 ${
                totalImages <= 1 ? '' :
                totalImages <= 4 ? '' :
                'md:col-span-2 md:row-span-2'
              }`}>
                {currentImages[0] && currentImages[0] !== '/images/placeholder.jpg' ? (
                  <Image
                    src={currentImages[0]}
                    alt={listing.titre}
                    fill
                    className="object-cover group-hover:brightness-90 transition-all"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                    <Home className="w-16 h-16 text-neutral-400" />
                    <span className="text-neutral-400 text-sm">Pas de photo</span>
                  </div>
                )}
              </div>

              {/* Side images - only render if they exist */}
              {currentImages.slice(1, 5).map((img, idx) => {
                const actualIndex = idx + 1;
                // For 5+ images layout (2 cols, 2 rows for side images):
                // Index 2 (top-right) and Index 4 (bottom-right) get rounded corners
                const isTopRight = totalImages >= 5 && actualIndex === 2;
                const isBottomRight = totalImages >= 5 && actualIndex === 4;
                // For smaller layouts, last image gets rounded corners
                const isLast = totalImages < 5 && actualIndex === sideImagesCount;

                return (
                  <div
                    key={idx}
                    className={`relative bg-neutral-200 dark:bg-neutral-800 hidden md:block ${
                      isTopRight ? 'rounded-tr-xl' : ''
                    } ${isBottomRight || isLast ? 'rounded-br-xl' : ''} ${
                      totalImages < 5 && actualIndex === 1 ? 'rounded-tr-xl' : ''
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`Photo ${startIndex + actualIndex + 1}`}
                      fill
                      className="object-cover group-hover:brightness-90 transition-all"
                    />
                  </div>
                );
              })}

              {/* Navigation arrows for swiper (if more than 5 images) */}
              {totalPages > 1 && (
                <>
                  {/* Previous button */}
                  {galleryPage > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setGalleryPage(prev => prev - 1);
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-neutral-900" />
                    </button>
                  )}

                  {/* Next button */}
                  {galleryPage < totalPages - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setGalleryPage(prev => prev + 1);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-neutral-900" />
                    </button>
                  )}

                  {/* Page indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setGalleryPage(idx);
                        }}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === galleryPage
                            ? 'bg-white w-6'
                            : 'bg-white/50 hover:bg-white/75'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Show all photos button - only show if we have real photos */}
              {totalImages > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(0);
                    setShowGallery(true);
                  }}
                  className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white text-neutral-900 text-sm font-medium rounded-lg shadow-lg hover:bg-neutral-100 transition-colors"
                >
                  <Grid3X3 className="w-4 h-4" />
                  {totalImages > 1 ? `Voir les ${totalImages} photos` : 'Voir la photo'}
                </button>
              )}

              {/* Mobile: Image counter - only show if we have real photos */}
              {totalImages > 0 && (
                <div className="md:hidden absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white text-sm">
                  {totalPages > 1
                    ? `${startIndex + 1}-${Math.min(startIndex + currentImages.length, totalImages)}/${totalImages}`
                    : `1/${totalImages}`
                  }
                </div>
              )}
            </div>
          );
        })()}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Left Column: Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Property Type & Location Summary */}
            <div className="border-b border-neutral-200 dark:border-dark-border pb-6">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                {getPropertyTypeLabel(listing.type_bien)} · {listing.quartier}, {listing.commune}
              </h2>
              <div className="flex flex-wrap items-center gap-1 text-neutral-600 dark:text-neutral-400">
                {listing.nombre_chambres && (
                  <>
                    <span>{listing.nombre_chambres} chambre{listing.nombre_chambres > 1 ? 's' : ''}</span>
                    <span>·</span>
                  </>
                )}
                {listing.nombre_salons && (
                  <>
                    <span>{listing.nombre_salons} salon{listing.nombre_salons > 1 ? 's' : ''}</span>
                    <span>·</span>
                  </>
                )}
                {listing.nombre_salles_bain && (
                  <>
                    <span>{listing.nombre_salles_bain} salle{listing.nombre_salles_bain > 1 ? 's' : ''} de bain</span>
                    <span>·</span>
                  </>
                )}
                {listing.surface_m2 && (
                  <span>{listing.surface_m2} m²</span>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-sm font-medium rounded-full">
                  {getTransactionLabel()}
                </span>
                {listing.meuble && (
                  <span className="px-3 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-sm font-medium rounded-full">
                    Meublé
                  </span>
                )}
                {listing.user?.statut_verification === 'VERIFIE' && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-full">
                    <Check className="w-3 h-3" />
                    Vérifié
                  </span>
                )}
              </div>
            </div>

            {/* Host/Owner Info */}
            <div className="flex items-center gap-4 border-b border-neutral-200 dark:border-dark-border pb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {listing.user?.nom_complet?.charAt(0) || '?'}
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Proposé par {listing.user?.nom_complet || 'Propriétaire'}
                </h3>
                {listing.user?.badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    listing.user.badge === 'DIAMANT' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                    listing.user.badge === 'OR' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    listing.user.badge === 'ARGENT' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' :
                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  }`}>
                    {listing.user.badge}
                  </span>
                )}
              </div>
            </div>

            {/* Key Features */}
            <div className="space-y-6 border-b border-neutral-200 dark:border-dark-border pb-6">
              {listing.surface_m2 && (
                <div className="flex gap-4">
                  <Square className="w-6 h-6 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-neutral-900 dark:text-white">Surface de {listing.surface_m2} m²</h4>
                    <p className="text-sm text-neutral-500">Espace spacieux pour votre confort</p>
                  </div>
                </div>
              )}
              {listing.nombre_chambres && (
                <div className="flex gap-4">
                  <Bed className="w-6 h-6 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-neutral-900 dark:text-white">{listing.nombre_chambres} chambre{listing.nombre_chambres > 1 ? 's' : ''}</h4>
                    <p className="text-sm text-neutral-500">Parfait pour {listing.nombre_chambres <= 2 ? 'un couple ou une petite famille' : 'une famille'}</p>
                  </div>
                </div>
              )}
              {listing.meuble && (
                <div className="flex gap-4">
                  <Sofa className="w-6 h-6 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-neutral-900 dark:text-white">Entièrement meublé</h4>
                    <p className="text-sm text-neutral-500">Prêt à emménager avec tous les équipements</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="border-b border-neutral-200 dark:border-dark-border pb-6">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                Description
              </h2>
              <p className="text-neutral-600 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
                {listing.description}
              </p>
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="border-b border-neutral-200 dark:border-dark-border pb-6">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                  Ce que propose ce logement
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {amenities.map((amenity) => {
                    const config = amenityConfig[amenity.toLowerCase()] || { icon: Check, label: amenity };
                    const Icon = config.icon;
                    return (
                      <div key={amenity} className="flex items-center gap-4">
                        <Icon className="w-6 h-6 text-neutral-600 dark:text-neutral-400" />
                        <span className="text-neutral-700 dark:text-neutral-300">{config.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location Map */}
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                Où se situe le logement
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                {listing.quartier}, {listing.commune}
              </p>
              <div className="h-72 md:h-96 rounded-xl overflow-hidden">
                <MapView commune={listing.commune} quartier={listing.quartier} />
              </div>
            </div>
          </div>

          {/* Right Column: Booking Card (Sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl p-6 shadow-xl">
                {/* Price */}
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                    {listing.formatted_price || formatPrice(listing.loyer_mensuel)}
                  </span>
                  <span className="text-neutral-500">{getPriceSuffix()}</span>
                </div>

                {/* Caution info */}
                {listing.caution && parseFloat(listing.caution) > 0 && (
                  <p className="text-sm text-neutral-500 mb-4">
                    Caution: {formatPrice(listing.caution)}
                  </p>
                )}

                {/* Short rental minimum duration */}
                {(listing.type_transaction === 'LOCATION_COURTE' || listing.type_transaction === 'location_courte') && listing.duree_minimum_jours && (
                  <p className="text-sm text-purple-600 dark:text-purple-400 mb-4">
                    Durée minimum: {listing.duree_minimum_jours} nuit{listing.duree_minimum_jours > 1 ? 's' : ''}
                  </p>
                )}

                {/* Action Buttons */}
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
                      className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-lg transition-all"
                    >
                      Contacter le propriétaire
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
                      className="w-full py-3 border-2 border-neutral-900 dark:border-white text-neutral-900 dark:text-white font-semibold rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-border transition-all"
                    >
                      Programmer une visite
                    </motion.button>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <p className="text-blue-600 dark:text-blue-400 font-medium">
                      Ceci est votre annonce
                    </p>
                    <Link
                      href={`/mes-annonces/${id}/modifier`}
                      className="text-sm text-blue-500 hover:underline"
                    >
                      Modifier l'annonce
                    </Link>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-neutral-200 dark:border-dark-border text-sm text-neutral-500">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{listing.vues_count || 0} vues</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(listing.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Properties */}
        {similarListings.length > 0 && (
          <div className="mt-16 border-t border-neutral-200 dark:border-dark-border pt-12">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-6">
              Biens similaires
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {similarListings.slice(0, 4).map((prop: any) => (
                <Link key={prop.id} href={`/bien/${prop.id}`}>
                  <motion.div
                    whileHover={{ y: -5 }}
                    className="group"
                  >
                    <div className="relative aspect-square bg-neutral-200 dark:bg-neutral-800 rounded-xl overflow-hidden mb-3">
                      {prop.photo_principale || prop.main_photo_url ? (
                        <Image
                          src={prop.photo_principale || prop.main_photo_url}
                          alt={prop.titre}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Home className="w-8 h-8 text-neutral-400" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-neutral-900 dark:text-white truncate">
                      {prop.quartier}, {prop.commune}
                    </h3>
                    <p className="text-sm text-neutral-500 truncate">{prop.titre}</p>
                    <p className="mt-1">
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {prop.formatted_price || formatPrice(prop.loyer_mensuel)}
                      </span>
                      <span className="text-neutral-500"> /mois</span>
                    </p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Fixed Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-card border-t border-neutral-200 dark:border-dark-border p-4 z-40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-neutral-900 dark:text-white">
              {listing.formatted_price || formatPrice(listing.loyer_mensuel)}
              <span className="text-sm font-normal text-neutral-500">{getPriceSuffix()}</span>
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
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-lg"
            >
              Contacter
            </motion.button>
          ) : (
            <span className="px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg">
              Votre annonce
            </span>
          )}
        </div>
      </div>

      {/* Fullscreen Gallery Modal */}
      <AnimatePresence>
        {showGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50"
          >
            {/* Close button */}
            <button
              onClick={() => setShowGallery(false)}
              className="absolute top-4 left-4 z-20 p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Image counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 text-white font-medium">
              {currentImageIndex + 1} / {images.length}
            </div>

            {/* Main image */}
            <div className="h-full flex items-center justify-center px-4">
              <div className="relative w-full h-full max-w-5xl max-h-[80vh]">
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
            </div>

            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </>
            )}

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4 pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                      index === currentImageIndex ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100'
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
            )}
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
                Contacter le propriétaire
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-6">
                Envoyez un message à {listing.user?.nom_complet || 'propriétaire'}
              </p>

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
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Écrivez votre message..."
                  rows={4}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:text-white resize-none"
                />

                {/* Send button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    if (!contactMessage.trim()) {
                      toast.error('Veuillez écrire un message');
                      return;
                    }
                    setIsSendingMessage(true);
                    try {
                      const response = await api.messaging.startConversation({
                        listing_id: listing.id,
                        message: contactMessage.trim(),
                      });
                      if (response.data?.success) {
                        toast.success('Message envoyé avec succès !');
                        setShowContactModal(false);
                        setContactMessage('');
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
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
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
                        type="button"
                        onClick={() => setVisitTime(time)}
                        className={`px-4 py-2 border rounded-lg text-sm transition-colors ${
                          visitTime === time
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-500'
                            : 'border-neutral-200 dark:border-dark-border hover:border-primary-500 hover:text-primary-500 dark:text-white'
                        }`}
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
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    placeholder="Questions ou précisions..."
                    className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-bg border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white resize-none"
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmitVisit}
                  disabled={isSubmittingVisit || !visitDate || !visitTime}
                  className="w-full px-6 py-4 bg-primary-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingVisit ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    'Envoyer la demande'
                  )}
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
