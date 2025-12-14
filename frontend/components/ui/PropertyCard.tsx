'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Heart,
  MapPin,
  Bed,
  Bath,
  Square,
  Eye,
  Share2,
  ChevronLeft,
  ChevronRight,
  Verified,
  Clock,
} from 'lucide-react';

interface PropertyCardProps {
  id: string;
  title: string;
  type: 'APPARTEMENT' | 'MAISON' | 'VILLA' | 'STUDIO' | 'BUREAU' | 'MAGASIN' | 'TERRAIN' | 'DUPLEX';
  transactionType: 'LOCATION' | 'VENTE';
  price: number;
  priceUnit?: 'GNF' | 'USD';
  period?: 'mois' | 'an';
  location: string;
  quartier: string;
  images: string[];
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  isAvailable?: boolean;
  isVerified?: boolean;
  isFavorite?: boolean;
  views?: number;
  createdAt?: string;
  onFavoriteClick?: () => void;
  variant?: 'grid' | 'list';
  className?: string;
}

const typeLabels: Record<string, string> = {
  APPARTEMENT: 'Appartement',
  MAISON: 'Maison',
  VILLA: 'Villa',
  STUDIO: 'Studio',
  BUREAU: 'Bureau',
  MAGASIN: 'Magasin',
  TERRAIN: 'Terrain',
  DUPLEX: 'Duplex',
};

const formatPrice = (price: number, unit: string = 'GNF'): string => {
  if (unit === 'USD') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  }
  return new Intl.NumberFormat('fr-GN').format(price) + ' GNF';
};

export default function PropertyCard({
  id,
  title,
  type,
  transactionType,
  price,
  priceUnit = 'GNF',
  period = 'mois',
  location,
  quartier,
  images,
  bedrooms,
  bathrooms,
  area,
  isAvailable = true,
  isVerified = false,
  isFavorite = false,
  views = 0,
  createdAt,
  onFavoriteClick,
  variant = 'grid',
  className = '',
}: PropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [favorite, setFavorite] = useState(isFavorite);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorite(!favorite);
    onFavoriteClick?.();
  };

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const isNew = createdAt && new Date().getTime() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;

  if (variant === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        className={`bg-white dark:bg-dark-card rounded-2xl shadow-soft hover:shadow-soft-lg transition-all duration-300 overflow-hidden ${className}`}
      >
        <Link href={`/annonces/${id}`} className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative w-full sm:w-72 h-48 sm:h-auto flex-shrink-0">
            <Image
              src={images[currentImageIndex] || '/images/placeholder-property.jpg'}
              alt={title}
              fill
              className="object-cover"
            />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                transactionType === 'LOCATION'
                  ? 'bg-secondary-500 text-white'
                  : 'bg-success-500 text-white'
              }`}>
                {transactionType === 'LOCATION' ? 'À louer' : 'À vendre'}
              </span>
              {isNew && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-500 text-white">
                  Nouveau
                </span>
              )}
            </div>

            {/* Availability Badge */}
            <div className="absolute top-3 right-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isAvailable
                  ? 'bg-success-100 text-success-700'
                  : 'bg-neutral-100 text-neutral-600'
              }`}>
                {isAvailable ? 'Disponible' : 'Indisponible'}
              </span>
            </div>

            {/* Favorite Button */}
            <button
              onClick={handleFavorite}
              className="absolute bottom-3 right-3 p-2.5 bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 transition-transform"
            >
              <Heart className={`w-5 h-5 ${favorite ? 'fill-error-500 text-error-500' : 'text-neutral-600'}`} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-lg">
                    {typeLabels[type]}
                  </span>
                  {isVerified && (
                    <span className="flex items-center gap-1 text-xs text-success-600">
                      <Verified className="w-4 h-4" />
                      Vérifié
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white line-clamp-1 mb-1">
                  {title}
                </h3>
                <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>{quartier}, {location}</span>
                </div>
              </div>

              {/* Price */}
              <div className="text-right">
                <p className="text-2xl font-bold text-primary-500">
                  {formatPrice(price, priceUnit)}
                </p>
                {transactionType === 'LOCATION' && (
                  <span className="text-sm text-neutral-500">/{period}</span>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-neutral-100 dark:border-dark-border">
              {bedrooms !== undefined && (
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <Bed className="w-5 h-5 text-neutral-400" />
                  <span className="text-sm font-medium">{bedrooms} ch.</span>
                </div>
              )}
              {bathrooms !== undefined && (
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <Bath className="w-5 h-5 text-neutral-400" />
                  <span className="text-sm font-medium">{bathrooms} sdb.</span>
                </div>
              )}
              {area !== undefined && (
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                  <Square className="w-5 h-5 text-neutral-400" />
                  <span className="text-sm font-medium">{area} m²</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-neutral-400 ml-auto">
                <Eye className="w-4 h-4" />
                <span className="text-xs">{views} vues</span>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // Grid variant (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`bg-white dark:bg-dark-card rounded-2xl shadow-soft hover:shadow-soft-lg transition-all duration-300 overflow-hidden ${className}`}
    >
      <Link href={`/annonces/${id}`}>
        {/* Image Container */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={images[currentImageIndex] || '/images/placeholder-property.jpg'}
            alt={title}
            fill
            className="object-cover transition-transform duration-500"
            style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
                transactionType === 'LOCATION'
                  ? 'bg-secondary-500/90 text-white'
                  : 'bg-success-500/90 text-white'
              }`}>
                {transactionType === 'LOCATION' ? 'À louer' : 'À vendre'}
              </span>
              {isNew && (
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-500/90 text-white backdrop-blur-sm">
                  Nouveau
                </span>
              )}
            </div>

            {/* Availability */}
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
              isAvailable
                ? 'bg-success-500/90 text-white'
                : 'bg-neutral-500/90 text-white'
            }`}>
              {isAvailable ? 'Disponible' : 'Indisponible'}
            </span>
          </div>

          {/* Image Navigation */}
          {images.length > 1 && isHovered && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 dark:bg-dark-card/90 rounded-full shadow-lg hover:scale-110 transition-transform"
              >
                <ChevronLeft className="w-4 h-4 text-neutral-700 dark:text-white" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 dark:bg-dark-card/90 rounded-full shadow-lg hover:scale-110 transition-transform"
              >
                <ChevronRight className="w-4 h-4 text-neutral-700 dark:text-white" />
              </button>
            </>
          )}

          {/* Image Dots */}
          {images.length > 1 && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.slice(0, 5).map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentImageIndex
                      ? 'bg-white w-4'
                      : 'bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Bottom Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-white">
                  {formatPrice(price, priceUnit)}
                </p>
                {transactionType === 'LOCATION' && (
                  <span className="text-sm text-white/80">/{period}</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="p-2.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                >
                  <Share2 className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={handleFavorite}
                  className="p-2.5 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                >
                  <Heart className={`w-4 h-4 ${favorite ? 'fill-error-400 text-error-400' : 'text-white'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-lg">
              {typeLabels[type]}
            </span>
            {isVerified && (
              <span className="flex items-center gap-1 text-xs text-success-600 dark:text-success-400">
                <Verified className="w-3.5 h-3.5" />
                Vérifié
              </span>
            )}
          </div>

          <h3 className="font-semibold text-neutral-900 dark:text-white line-clamp-1 mb-1.5">
            {title}
          </h3>

          <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 text-sm mb-3">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-1">{quartier}, {location}</span>
          </div>

          {/* Features */}
          <div className="flex items-center gap-4 pt-3 border-t border-neutral-100 dark:border-dark-border">
            {bedrooms !== undefined && (
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                <Bed className="w-4 h-4 text-neutral-400" />
                <span className="text-sm">{bedrooms}</span>
              </div>
            )}
            {bathrooms !== undefined && (
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                <Bath className="w-4 h-4 text-neutral-400" />
                <span className="text-sm">{bathrooms}</span>
              </div>
            )}
            {area !== undefined && (
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                <Square className="w-4 h-4 text-neutral-400" />
                <span className="text-sm">{area} m²</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-neutral-400 ml-auto">
              <Eye className="w-3.5 h-3.5" />
              <span className="text-xs">{views}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
