'use client';

import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { TypeBien } from './TypeBienSelector';

export interface Listing {
  id: string;
  titre: string;
  prix?: number;
  loyer_mensuel?: string;
  operationType?: 'LOCATION' | 'LOCATION_COURTE' | 'VENTE';
  type_transaction?: 'location' | 'location_courte' | 'vente' | 'LOCATION' | 'LOCATION_COURTE' | 'VENTE';
  type_bien?: string;
  typeBien?: TypeBien;
  commune: string;
  quartier: string;
  superficie?: number;
  surface_m2?: number;
  nombreChambres?: number;
  nombre_chambres?: number;
  nombreSallesDeBain?: number;
  nombre_salles_bain?: number;
  duree_minimum_jours?: number;
  photos?: string[] | null;
  main_photo_url?: string;
  photo_principale?: string;
  listing_photos?: Array<{ url?: string; medium_url?: string }>;
  formatted_price?: string;
  createdAt?: string;
  created_at?: string;
}

interface ListingCardProps {
  listing: Listing;
  priority?: boolean;
}

function ListingCard({ listing, priority = false }: ListingCardProps) {
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
      APPARTEMENT_2CH: '2 Chambres',
      APPARTEMENT_3CH: '3 Chambres',
      VILLA: 'Villa',
      DUPLEX: 'Duplex',
      BUREAU: 'Bureau',
    };
    return labels[type] || type;
  };

  // Get main photo from various possible sources
  // Filter out external placeholder URLs that aren't configured in Next.js
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    // Allow local URLs and configured domains
    if (url.startsWith('/') || url.startsWith('http://localhost')) return true;
    // Block external placeholder services
    if (url.includes('via.placeholder.com') || url.includes('placeholder.com')) return false;
    return true;
  };

  const rawPhoto =
    listing.main_photo_url ||
    listing.photo_principale ||
    (listing.photos && listing.photos.length > 0 ? listing.photos[0] : null) ||
    (listing.listing_photos && listing.listing_photos.length > 0
      ? (listing.listing_photos[0].medium_url || listing.listing_photos[0].url)
      : null);

  const mainPhoto = isValidImageUrl(rawPhoto) ? rawPhoto! : '/placeholder-property.jpg';

  // Get price from various possible sources
  const price = listing.prix || (listing.loyer_mensuel ? parseFloat(listing.loyer_mensuel) : 0);
  const displayPrice = listing.formatted_price || formatPrice(price);

  // Get type from various possible sources
  const typeBien = listing.typeBien || listing.type_bien as TypeBien;

  // Get surface and rooms from various possible sources
  const superficie = listing.superficie || listing.surface_m2 || 0;
  const nombreChambres = listing.nombreChambres || listing.nombre_chambres || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
    >
      <Link
        href={`/annonces/${listing.id}`}
        className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      >
      {/* Image Container */}
      <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden">
        <Image
          src={mainPhoto}
          alt={listing.titre}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
        />

        {/* Operation Type Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
              listing.operationType === 'LOCATION' || listing.type_transaction === 'location' || listing.type_transaction === 'LOCATION'
                ? 'bg-blue-600'
                : listing.operationType === 'LOCATION_COURTE' || listing.type_transaction === 'location_courte' || listing.type_transaction === 'LOCATION_COURTE'
                ? 'bg-purple-600'
                : 'bg-green-600'
            }`}
          >
            {listing.operationType === 'LOCATION' || listing.type_transaction === 'location' || listing.type_transaction === 'LOCATION'
              ? 'À louer'
              : listing.operationType === 'LOCATION_COURTE' || listing.type_transaction === 'location_courte' || listing.type_transaction === 'LOCATION_COURTE'
              ? 'Courte durée'
              : 'À vendre'}
          </span>
        </div>

        {/* Photos Count Badge */}
        {((listing.photos && listing.photos.length > 1) || (listing.listing_photos && listing.listing_photos.length > 1)) && (
          <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
            {listing.photos?.length || listing.listing_photos?.length || 0}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <div className="mb-2">
          <div className="text-2xl font-bold text-gray-900">
            {displayPrice}
          </div>
          {(listing.operationType === 'LOCATION' || listing.type_transaction === 'location' || listing.type_transaction === 'LOCATION') && (
            <div className="text-xs text-gray-600">par mois</div>
          )}
          {(listing.operationType === 'LOCATION_COURTE' || listing.type_transaction === 'location_courte' || listing.type_transaction === 'LOCATION_COURTE') && (
            <div className="text-xs text-purple-600 font-medium">
              par jour {listing.duree_minimum_jours && listing.duree_minimum_jours > 1 && `(min. ${listing.duree_minimum_jours} jours)`}
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-700 transition-colors">
          {listing.titre}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
          <svg
            className="w-4 h-4 text-gray-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
          <span className="line-clamp-1">
            {listing.quartier}, {listing.commune}
          </span>
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 text-sm text-gray-700 border-t border-gray-200 pt-3">
          {/* Type */}
          {typeBien && (
            <div className="flex items-center gap-1" title="Type de bien">
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span className="text-xs">{getTypeBienLabel(typeBien)}</span>
            </div>
          )}

          {/* Superficie */}
          {superficie > 0 && (
            <div className="flex items-center gap-1" title="Superficie">
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs">{superficie} m²</span>
            </div>
          )}

          {/* Chambres */}
          {nombreChambres > 0 && (
            <div className="flex items-center gap-1" title="Chambres">
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
              </svg>
              <span className="text-xs">{nombreChambres} ch</span>
            </div>
          )}

          {/* Salles de bain */}
          {(listing.nombreSallesDeBain || listing.nombre_salles_bain) && (listing.nombreSallesDeBain || listing.nombre_salles_bain || 0) > 0 && (
            <div className="flex items-center gap-1" title="Salles de bain">
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs">{listing.nombreSallesDeBain || listing.nombre_salles_bain} sdb</span>
            </div>
          )}
        </div>
      </div>
      </Link>
    </motion.div>
  );
}

export default memo(ListingCard);
