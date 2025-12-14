'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import {
  Heart,
  MapPin,
  Bed,
  Bath,
  Square,
  Trash2,
  Grid3X3,
  List,
  Check,
  Sparkles,
  Bell,
  Loader2,
} from 'lucide-react';

interface Favorite {
  id: string;
  titre: string;
  type_bien: string;
  type_transaction: 'LOCATION' | 'VENTE';
  prix: number;
  quartier: string;
  commune: string;
  nb_chambres: number;
  nb_salles_bain: number;
  surface: number;
  photo_principale: string | null;
  est_premium: boolean;
  est_verifie: boolean;
  added_at: string;
  proprietaire: {
    id: string;
    nom_complet: string;
    badge: string;
  };
}

// Fetch favorites from API
async function fetchFavorites(): Promise<Favorite[]> {
  const response = await api.favorites.list();
  return response.data.data.favorites;
}

// Format price
const formatPrice = (price: number) => {
  if (price >= 1000000000) {
    return (price / 1000000000).toFixed(1) + ' Mrd GNF';
  }
  if (price >= 1000000) {
    const millions = price / 1000000;
    return millions % 1 === 0
      ? millions.toFixed(0) + 'M GNF'
      : millions.toFixed(1) + 'M GNF';
  }
  return new Intl.NumberFormat('fr-GN').format(price) + ' GNF';
};

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return date.toLocaleDateString('fr-FR');
};

// Favorite Card
function FavoriteCard({
  property,
  viewMode,
  onRemove,
  isRemoving,
}: {
  property: Favorite;
  viewMode: 'grid' | 'list';
  onRemove: () => void;
  isRemoving: boolean;
}) {
  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isRemoving ? 0 : 1, scale: isRemoving ? 0.95 : 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
      >
        <Link href={`/bien/${property.id}`} className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative w-full sm:w-56 h-40 sm:h-auto flex-shrink-0">
            {property.photo_principale ? (
              <img
                src={property.photo_principale}
                alt={property.titre}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary-200 to-primary-300 dark:from-primary-900 dark:to-primary-800" />
            )}

            {/* Badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              {property.est_premium && (
                <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-full">
                  <Sparkles className="w-3 h-3" />
                  Premium
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-md">
                    {property.type_bien}
                  </span>
                  {property.est_verifie && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <Check className="w-3 h-3" />
                      Verifie
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                  {property.titre}
                </h3>
                <div className="flex items-center gap-1 text-neutral-500 text-sm mb-2">
                  <MapPin className="w-4 h-4" />
                  {property.quartier}, {property.commune}
                </div>
                <p className="text-xs text-neutral-400">
                  Ajoute {formatDate(property.added_at)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xl font-bold text-primary-500">
                  {formatPrice(property.prix)}
                </p>
                {(property.type_transaction === 'LOCATION' || property.type_transaction === 'location') && (
                  <span className="text-sm text-neutral-500">/mois</span>
                )}
                {(property.type_transaction === 'LOCATION_COURTE' || property.type_transaction === 'location_courte') && (
                  <span className="text-sm text-purple-500">/jour</span>
                )}
              </div>
            </div>

            {/* Features & Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-dark-border">
              <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-300">
                {property.nb_chambres > 0 && <span>{property.nb_chambres} ch.</span>}
                <span>{property.nb_salles_bain} sdb.</span>
                <span>{property.surface} m2</span>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.preventDefault();
                  onRemove();
                }}
                disabled={isRemoving}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {isRemoving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </motion.button>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isRemoving ? 0 : 1, scale: isRemoving ? 0.95 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden group"
    >
      <Link href={`/bien/${property.id}`}>
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {property.photo_principale ? (
            <img
              src={property.photo_principale}
              alt={property.titre}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-200 to-primary-300 dark:from-primary-900 dark:to-primary-800 group-hover:scale-105 transition-transform duration-300" />
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {property.est_premium && (
              <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-full">
                <Sparkles className="w-3 h-3" />
                Premium
              </span>
            )}
          </div>

          {/* Remove Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.preventDefault();
              onRemove();
            }}
            disabled={isRemoving}
            className="absolute top-3 right-3 p-2.5 bg-white/90 dark:bg-dark-card/90 rounded-full shadow-lg z-10 disabled:opacity-50"
          >
            {isRemoving ? (
              <Loader2 className="w-5 h-5 animate-spin text-red-500" />
            ) : (
              <Heart className="w-5 h-5 fill-red-500 text-red-500" />
            )}
          </motion.button>

          {/* Price */}
          <div className="absolute bottom-3 left-3">
            <span className="px-3 py-1.5 bg-white dark:bg-dark-card rounded-lg font-bold text-neutral-900 dark:text-white shadow-lg">
              {formatPrice(property.prix)}
              {(property.type_transaction === 'LOCATION' || property.type_transaction === 'location') && (
                <span className="text-sm font-normal text-neutral-500">/mois</span>
              )}
              {(property.type_transaction === 'LOCATION_COURTE' || property.type_transaction === 'location_courte') && (
                <span className="text-sm font-normal text-purple-500">/jour</span>
              )}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-md">
              {property.type_bien}
            </span>
            {property.est_verifie && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <Check className="w-3 h-3" />
                Verifie
              </span>
            )}
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
            {property.nb_chambres > 0 && <span>{property.nb_chambres} ch.</span>}
            <span className="w-1 h-1 bg-neutral-300 rounded-full" />
            <span>{property.nb_salles_bain} sdb.</span>
            <span className="w-1 h-1 bg-neutral-300 rounded-full" />
            <span>{property.surface} m2</span>
          </div>

          {/* Added date */}
          <p className="text-xs text-neutral-400 mt-2">
            Ajoute {formatDate(property.added_at)}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

export default function FavoritesPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch favorites
  const { data: favorites = [], isLoading, error } = useQuery({
    queryKey: ['favorites'],
    queryFn: fetchFavorites,
  });

  // Remove favorite mutation
  const removeMutation = useMutation({
    mutationFn: (listingId: string) => api.favorites.remove(listingId),
    onMutate: (listingId) => {
      setRemovingId(listingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onSettled: () => {
      setRemovingId(null);
    },
  });

  const handleRemove = (listingId: string) => {
    removeMutation.mutate(listingId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-red-500 mb-4">Erreur lors du chargement des favoris</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['favorites'] })}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg"
          >
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-14 md:top-16 z-30 bg-white dark:bg-dark-card shadow-soft">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                Mes favoris
              </h1>
              <p className="text-sm text-neutral-500">
                {favorites.length} bien(s) sauvegarde(s)
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center bg-neutral-100 dark:bg-dark-bg rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-dark-card text-primary-500 shadow-sm'
                      : 'text-neutral-500'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-dark-card text-primary-500 shadow-sm'
                      : 'text-neutral-500'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {favorites.length > 0 ? (
          <AnimatePresence mode="popLayout">
            <motion.div
              layout
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              }
            >
              {favorites.map((property) => (
                <FavoriteCard
                  key={property.id}
                  property={property}
                  viewMode={viewMode}
                  onRemove={() => handleRemove(property.id)}
                  isRemoving={removingId === property.id}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-neutral-100 dark:bg-dark-card rounded-full flex items-center justify-center">
              <Heart className="w-10 h-10 text-neutral-400" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              Aucun favori
            </h2>
            <p className="text-neutral-500 mb-6 max-w-md mx-auto">
              Explorez nos annonces et sauvegardez celles qui vous interessent en cliquant sur le coeur.
            </p>
            <Link href="/recherche">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3 bg-primary-500 text-white font-semibold rounded-xl"
              >
                Explorer les annonces
              </motion.button>
            </Link>
          </motion.div>
        )}

        {/* Info Card */}
        {favorites.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 p-6 bg-primary-50 dark:bg-primary-500/10 rounded-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-100 dark:bg-primary-500/20 rounded-xl">
                <Bell className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
                  Alertes prix
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Activez les alertes sur vos favoris pour etre notifie en cas de baisse de prix ou de changement de disponibilite.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
