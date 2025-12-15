'use client';

import { api } from '@/lib/api/client';
import { CONAKRY_COMMUNES } from '@/lib/data/communes';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Briefcase,
  Building2,
  ChevronRight,
  Clock,
  Heart,
  Home,
  Loader2,
  MapPin,
  Phone,
  Play,
  Search,
  Shield,
  Star,
  Store,
  Users,
  Zap
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Listing {
  id: string;
  titre: string;
  type_bien: string;
  loyer_mensuel: string;
  formatted_price: string;
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
  created_at: string;
}

// Fetch premium listings from API
async function fetchPremiumListings(): Promise<Listing[]> {
  const response = await api.listings.list({ premium: true, limit: 8 });
  return response.data.data.listings || [];
}

// Fetch quartier stats from API
async function fetchQuartierStats(): Promise<{ name: string; count: number }[]> {
  // Use communes list and get counts from listings
  const response = await api.listings.list({ group_by: 'quartier', limit: 100 });
  const listings = response.data.data.listings || [];

  // Group by quartier and count
  const quartierCounts: Record<string, number> = {};
  listings.forEach((listing: Listing) => {
    const quartier = listing.quartier || 'Autre';
    quartierCounts[quartier] = (quartierCounts[quartier] || 0) + 1;
  });

  // Convert to array and sort by count
  return Object.entries(quartierCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

// Format price
const formatPrice = (price: number | string | undefined | null) => {
  if (price === undefined || price === null) return '0 GNF';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0 GNF';
  return new Intl.NumberFormat('fr-GN').format(num) + ' GNF';
};

// Property Card Component
function PropertyCard({ property }: { property: Listing }) {
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

  // Get photo URL - handle both string (JSON) and array formats
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -8 }}
      className="group bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
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
            <div className="absolute inset-0 bg-gradient-to-br from-primary-200 to-primary-300 dark:from-primary-900 dark:to-primary-800" />
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2 z-10">
            {isNew && (
              <span className="px-2.5 py-1 bg-primary-500 text-white text-xs font-semibold rounded-full">
                Nouveau
              </span>
            )}
          </div>

          {/* Favorite Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleFavorite}
            className="absolute top-3 right-3 p-2.5 bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm rounded-full shadow-lg z-10"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-neutral-600'
                }`}
            />
          </motion.button>

          {/* Price Tag */}
          <div className="absolute bottom-3 left-3 z-10">
            <span className="px-4 py-2 bg-white dark:bg-dark-card rounded-xl font-bold text-lg text-neutral-900 dark:text-white shadow-lg">
              {property.formatted_price || formatPrice(property.loyer_mensuel)}
              {isLocation && <span className="text-sm font-normal text-neutral-500">/mois</span>}
              {isLocationCourte && <span className="text-sm font-normal text-purple-500">/jour</span>}
              {!isLocation && !isLocationCourte && <span className="text-sm font-normal text-neutral-500">/mois</span>}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-md">
              {property.type_bien}
            </span>
          </div>

          <h3 className="font-semibold text-neutral-900 dark:text-white mb-1 line-clamp-1 group-hover:text-primary-500 transition-colors">
            {property.titre}
          </h3>

          <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 text-sm mb-3">
            <MapPin className="w-4 h-4" />
            <span>{property.quartier}, {property.commune}</span>
          </div>

          {/* Features */}
          <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-300">
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
                <span>{property.surface_m2} m²</span>
              </>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Category Button
function CategoryButton({
  icon: Icon,
  label,
  href,
  color,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.05, y: -4 }}
        whileTap={{ scale: 0.95 }}
        className={`flex flex-col items-center gap-3 p-5 ${color} rounded-2xl shadow-soft cursor-pointer transition-shadow hover:shadow-lg`}
      >
        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
          <Icon className="w-7 h-7 text-white" />
        </div>
        <span className="text-white font-semibold text-sm">{label}</span>
      </motion.div>
    </Link>
  );
}

// Quartier Card
function QuartierCard({ quartier }: { quartier: { name: string; count: number } }) {
  return (
    <Link href={`/recherche?quartier=${quartier.name}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="relative h-40 rounded-2xl overflow-hidden group cursor-pointer"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 to-neutral-900" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-white font-bold text-lg mb-1">{quartier.name}</h3>
          <p className="text-white/80 text-sm">{quartier.count} annonces</p>
        </div>

        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-2 bg-white/20 backdrop-blur-sm rounded-full">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function ClientHomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'location' | 'achat'>('location');

  // Fetch premium listings
  const { data: premiumListings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ['listings', 'premium'],
    queryFn: fetchPremiumListings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch quartier stats
  const { data: quartiers = [] } = useQuery({
    queryKey: ['quartiers', 'stats'],
    queryFn: fetchQuartierStats,
    staleTime: 10 * 60 * 1000, // 10 minutes
    // Fallback to default quartiers if API fails
    placeholderData: CONAKRY_COMMUNES.map(name => ({ name, count: 0 })),
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    params.set('type_transaction', searchType === 'location' ? 'LOCATION' : 'VENTE');
    router.push(`/recherche?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Image */}
        <Image
          src="/images/banner.jpg"
          alt="ImmoGuinee Banner"
          fill
          priority
          quality={80}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDAwUBAAAAAAAAAAAAAQIDAAQRBRIhBhMiMUFR/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAQEBAAAAAAAAAAAAAAAAAQIRITH/2gAMAwEAAhEDEEA/AKOi6Pp+n6hJc21tGkrptLAkEj+VKpSlKJjT/9k="
          className="object-cover"
          sizes="100vw"
          style={{ objectPosition: 'center 30%' }}
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/5 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-8 pb-16 md:pt-16 md:pb-24">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 md:mb-12"
          >
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Trouvez votre chez-vous
              <br />
              <span className="text-orange-200">en Guinee</span>
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Des milliers de proprietes a louer et a vendre dans toute la Guinee.
              Trouvez celle qui vous correspond.
            </p>
          </motion.div>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-3xl mx-auto"
          >
            {/* Search Type Toggle */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex bg-white/10 backdrop-blur-sm rounded-full p-1">
                <button
                  onClick={() => setSearchType('location')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${searchType === 'location'
                    ? 'bg-white text-primary-600 shadow-md'
                    : 'text-white hover:bg-white/10'
                    }`}
                >
                  Location
                </button>
                <button
                  onClick={() => setSearchType('achat')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${searchType === 'achat'
                    ? 'bg-white text-primary-600 shadow-md'
                    : 'text-white hover:bg-white/10'
                    }`}
                >
                  Achat
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl p-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-3 px-4 bg-neutral-50 dark:bg-dark-bg rounded-xl">
                  <Search className="w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Quartier, ville ou type de bien..."
                    className="flex-1 py-3 sm:py-4 bg-transparent text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none text-sm sm:text-base border-neutral-200 dark:border-neutral-700"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSearch}
                  className="p-4 md:px-8 md:py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors shrink-0"
                >
                  <Search className="w-5 h-5 md:hidden" />
                  <span className="hidden md:inline">Rechercher</span>
                </motion.button>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {CONAKRY_COMMUNES.slice(0, 5).map((commune) => (
                <Link
                  key={commune}
                  href={`/recherche?commune=${commune}`}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm rounded-full transition-colors"
                >
                  {commune}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CategoryButton
            icon={Home}
            label="Appartements"
            href="/recherche?type_bien=APPARTEMENT"
            color="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <CategoryButton
            icon={Building2}
            label="Maisons & Villas"
            href="/recherche?type_bien=MAISON"
            color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          />
          <CategoryButton
            icon={Store}
            label="Magasins"
            href="/recherche?type_bien=MAGASIN"
            color="bg-gradient-to-br from-purple-500 to-purple-600"
          />
          <CategoryButton
            icon={Briefcase}
            label="Bureaux"
            href="/recherche?type_bien=BUREAU"
            color="bg-gradient-to-br from-amber-500 to-amber-600"
          />
        </div>
      </section>

      {/* Premium Listings */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
              Annonces Premium
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400">
              Les meilleures proprietes selectionnees pour vous
            </p>
          </div>
          <Link
            href="/recherche?premium=true"
            className="hidden md:flex items-center gap-2 text-primary-500 hover:text-primary-600 font-medium"
          >
            Voir tout
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>

        {listingsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : premiumListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {premiumListings.slice(0, 4).map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-neutral-500">Aucune annonce premium pour le moment</p>
          </div>
        )}

        <div className="mt-8 text-center md:hidden">
          <Link
            href="/recherche?premium=true"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl"
          >
            Voir toutes les annonces
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Quartiers Section */}
      <section className="bg-white dark:bg-dark-card py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
              Explorez par quartier
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400">
              Decouvrez les quartiers les plus recherches de Conakry
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quartiers.map((quartier) => (
              <QuartierCard key={quartier.name} quartier={quartier} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Pourquoi choisir ImmoGuinee ?
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            La plateforme immobiliere de reference en Guinee
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Shield,
              title: 'Annonces verifiees',
              description: 'Toutes nos annonces sont verifiees par notre equipe pour garantir leur authenticite.',
              color: 'text-emerald-500',
              bg: 'bg-emerald-50 dark:bg-emerald-500/10',
            },
            {
              icon: Clock,
              title: 'Reponse rapide',
              description: 'Contactez directement les proprietaires et obtenez une reponse en moins de 24h.',
              color: 'text-blue-500',
              bg: 'bg-blue-50 dark:bg-blue-500/10',
            },
            {
              icon: Zap,
              title: 'Simple et efficace',
              description: 'Une interface intuitive pour trouver votre bien ideal en quelques clics.',
              color: 'text-primary-500',
              bg: 'bg-primary-50 dark:bg-primary-500/10',
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className={`inline-flex p-4 ${feature.bg} rounded-2xl mb-4`}>
                <feature.icon className={`w-8 h-8 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-to-r from-primary-500 to-orange-500 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '5000+', label: 'Annonces actives', icon: Home },
              { value: '15K+', label: 'Utilisateurs', icon: Users },
              { value: '98%', label: 'Satisfaction', icon: Star },
              { value: '24/7', label: 'Support', icon: Phone },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <stat.icon className="w-8 h-8 text-white/80 mx-auto mb-3" />
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-white/80">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-neutral-900 to-neutral-800 dark:from-neutral-800 dark:to-neutral-900 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl" />

          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
              Vous avez un bien a louer ou vendre ?
            </h2>
            <p className="text-neutral-400 mb-8 max-w-2xl mx-auto">
              Publiez votre annonce gratuitement et touchez des milliers de clients potentiels en Guinee.
            </p>
            <Link href="/publier">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl inline-flex items-center gap-2 transition-colors"
              >
                Publier une annonce
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Download App Section */}
      <section className="bg-primary-50 dark:bg-primary-500/5 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-4">
                Telechargez l'app ImmoGuinee
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Recevez des alertes instantanees pour les nouvelles annonces,
                discutez avec les proprietaires et gerez vos favoris ou que vous soyez.
              </p>
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 px-6 py-3 bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white rounded-xl"
                >
                  <Play className="w-6 h-6" />
                  <div className="text-left">
                    <p className="text-[10px] opacity-80">Disponible sur</p>
                    <p className="font-semibold">Google Play</p>
                  </div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 px-6 py-3 bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white rounded-xl"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] opacity-80">Telecharger sur</p>
                    <p className="font-semibold">App Store</p>
                  </div>
                </motion.button>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="relative">
                <div className="w-64 h-[500px] bg-gradient-to-br from-primary-400 to-primary-600 rounded-[3rem] shadow-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
