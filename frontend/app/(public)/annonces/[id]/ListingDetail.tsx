'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useListing, useIncrementListingView } from '@/lib/hooks/useListings';
import type { TypeBien } from '@/components/listings/TypeBienSelector';

// Dynamically import map component to avoid SSR issues
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-gray-600">Chargement de la carte...</div>
    </div>
  ),
});

interface ListingDetailProps {
  listingId: string;
}

export default function ListingDetail({ listingId }: ListingDetailProps) {
  const { data: listing, isLoading, isError, error } = useListing(listingId);
  const incrementView = useIncrementListingView();

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);

  // Increment view count on mount
  useEffect(() => {
    if (listingId) {
      incrementView.mutate(listingId);
    }
  }, [listingId]);

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getTypeBienLabel = (type: TypeBien): string => {
    const labels: Record<TypeBien, string> = {
      STUDIO: 'Studio',
      CHAMBRE_SALON: 'Chambre-Salon',
      APPARTEMENT_2CH: 'Appartement 2 Chambres',
      APPARTEMENT_3CH: 'Appartement 3 Chambres',
      VILLA: 'Villa',
      DUPLEX: 'Duplex',
      BUREAU: 'Bureau',
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    if (diffDays < 365)
      return `Il y a ${Math.floor(diffDays / 30)} mois`;
    return `Il y a ${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
  };

  // Filter out invalid image URLs (external placeholders not configured in Next.js)
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    if (url.startsWith('/') || url.startsWith('http://localhost')) return true;
    if (url.includes('via.placeholder.com') || url.includes('placeholder.com')) return false;
    return true;
  };

  // Normalize photos from various API formats
  const getPhotos = (): string[] => {
    if (!listing) return ['/placeholder-property.jpg'];

    // Try listing.photos first
    if (listing.photos && Array.isArray(listing.photos) && listing.photos.length > 0) {
      const validPhotos = listing.photos.filter(isValidImageUrl);
      return validPhotos.length > 0 ? validPhotos : ['/placeholder-property.jpg'];
    }

    // Try listing_photos (API format)
    if (listing.listing_photos && Array.isArray(listing.listing_photos) && listing.listing_photos.length > 0) {
      const urls = listing.listing_photos
        .map((p: any) => p.medium_url || p.url || p.large_url)
        .filter(isValidImageUrl);
      return urls.length > 0 ? urls : ['/placeholder-property.jpg'];
    }

    // Try main_photo_url or photo_principale
    const mainPhoto = listing.main_photo_url || listing.photo_principale;
    if (isValidImageUrl(mainPhoto)) {
      return [mainPhoto];
    }

    return ['/placeholder-property.jpg'];
  };

  const photos = getPhotos();

  // Normalize listing data from API (snake_case to camelCase)
  const normalizedListing = listing ? {
    ...listing,
    // Price: use formatted_price or calculate from loyer_mensuel/prix
    prix: listing.prix || (listing.loyer_mensuel ? parseFloat(listing.loyer_mensuel) : 0),
    formattedPrice: listing.formatted_price,
    // Operation type
    operationType: listing.operationType || (listing.loyer_mensuel ? 'LOCATION' : 'VENTE'),
    // Type of property
    typeBien: listing.typeBien || listing.type_bien,
    // Surface
    superficie: listing.superficie || listing.surface_m2 || 0,
    // Rooms
    nombreChambres: listing.nombreChambres || listing.nombre_chambres || 0,
    nombreSallesDeBain: listing.nombreSallesDeBain || listing.nombre_salles_bain || 0,
    // Dates
    createdAt: listing.createdAt || listing.created_at,
    // Description
    description: listing.description || '',
  } : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Chargement de l&apos;annonce...</p>
        </div>
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-lg p-8 text-center">
          <svg
            className="w-16 h-16 text-red-600 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Annonce introuvable</h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error ? error.message : 'Cette annonce n\'existe pas ou a été supprimée.'}
          </p>
          <Link
            href="/annonces"
            className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Voir toutes les annonces
          </Link>
        </div>
      </div>
    );
  }

  // Use normalized listing for display
  const displayListing = normalizedListing!;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-green-600 hover:text-green-700 transition-colors">
              Accueil
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/annonces" className="text-green-600 hover:text-green-700 transition-colors">
              Annonces
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 line-clamp-1">{displayListing.titre}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Photo Gallery */}
        <div className="mb-8">
          {/* Main Photo */}
          <div className="relative aspect-[16/9] bg-gray-200 rounded-xl overflow-hidden mb-4">
            <Image
              src={photos[selectedPhotoIndex] || '/placeholder-property.jpg'}
              alt={`${displayListing.titre} - Photo ${selectedPhotoIndex + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
              priority
            />

            {/* Navigation arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setSelectedPhotoIndex((prev) =>
                      prev === 0 ? photos.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Photo précédente"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() =>
                    setSelectedPhotoIndex((prev) =>
                      prev === photos.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Photo suivante"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Photo counter */}
                <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/70 text-white rounded-lg text-sm font-medium">
                  {selectedPhotoIndex + 1} / {photos.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
              {photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPhotoIndex(index)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    index === selectedPhotoIndex
                      ? 'border-green-600 scale-105'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <Image
                    src={photo}
                    alt={`Miniature ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 25vw, (max-width: 1024px) 16vw, 12vw"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Left column: Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${
                        displayListing.operationType === 'LOCATION' ? 'bg-blue-600' : 'bg-green-600'
                      }`}
                    >
                      {displayListing.operationType === 'LOCATION' ? 'À louer' : 'À vendre'}
                    </span>
                    <span className="text-sm text-gray-600">{formatDate(displayListing.createdAt)}</span>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{displayListing.titre}</h1>
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>
                      {displayListing.quartier}, {displayListing.commune}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">{displayListing.formattedPrice || formatPrice(displayListing.prix)}</div>
                  {(displayListing.operationType === 'LOCATION' || displayListing.type_transaction === 'location' || displayListing.type_transaction === 'LOCATION') && (
                    <div className="text-sm text-gray-600">par mois</div>
                  )}
                  {(displayListing.operationType === 'LOCATION_COURTE' || displayListing.type_transaction === 'location_courte' || displayListing.type_transaction === 'LOCATION_COURTE') && (
                    <div className="text-sm text-purple-600 font-medium">
                      par jour {displayListing.duree_minimum_jours && displayListing.duree_minimum_jours > 1 && `(min. ${displayListing.duree_minimum_jours} jours)`}
                    </div>
                  )}
                </div>
              </div>

              {/* Key features grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  <div>
                    <div className="text-xs text-gray-600">Type</div>
                    <div className="font-semibold text-gray-900">{getTypeBienLabel(displayListing.typeBien)}</div>
                  </div>
                </div>

                {displayListing.superficie > 0 && (
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <div className="text-xs text-gray-600">Superficie</div>
                      <div className="font-semibold text-gray-900">{displayListing.superficie} m²</div>
                    </div>
                  </div>
                )}

                {displayListing.nombreChambres > 0 && (
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                    </svg>
                    <div>
                      <div className="text-xs text-gray-600">Chambres</div>
                      <div className="font-semibold text-gray-900">{displayListing.nombreChambres}</div>
                    </div>
                  </div>
                )}

                {displayListing.nombreSallesDeBain > 0 && (
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <div className="text-xs text-gray-600">Salles de bain</div>
                      <div className="font-semibold text-gray-900">{displayListing.nombreSallesDeBain}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{displayListing.description}</p>
              </div>
            </div>

            {/* Map */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Localisation</h2>
              <div className="h-96 rounded-lg overflow-hidden">
                <MapView commune={displayListing.commune} quartier={displayListing.quartier} />
              </div>
              <p className="mt-4 text-sm text-gray-600">
                {displayListing.quartier}, {displayListing.commune}
              </p>
            </div>
          </div>

          {/* Right column: Contact */}
          <div className="lg:col-span-1 mt-6 lg:mt-0">
            <div className="sticky top-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contacter le propriétaire</h3>

              <button
                onClick={() => setShowContactModal(true)}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Envoyer un message
              </button>

              <button
                className="w-full mt-3 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                Appeler
              </button>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Partager cette annonce</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: displayListing.titre,
                          url: window.location.href,
                        });
                      }
                    }}
                    className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm font-medium"
                  >
                    Partager
                  </button>
                  <button className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal (placeholder) */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Envoyer un message</h3>
            <p className="text-gray-600 mb-4">
              Fonctionnalité de messagerie en cours de développement.
            </p>
            <button
              onClick={() => setShowContactModal(false)}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
