'use client';

import { api } from '@/lib/api/client';
import { CONAKRY_COMMUNES } from '@/lib/data/communes';
import { useTranslations } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BedDouble,
  Bell,
  Briefcase,
  Building2,
  Check,
  ChevronRight,
  Heart,
  Home,
  Loader2,
  Lock,
  Maximize2,
  MapPin,
  MessageCircle,
  Search,
  Shield,
  Store,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface Listing {
  id: string;
  titre: string;
  type_bien: string;
  type_transaction?: string;
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

export interface QuartierStat {
  name: string;
  count: number;
}

// Fetch premium listings from API (client-side refetch / revalidation)
async function fetchPremiumListings(): Promise<Listing[]> {
  const response = await api.listings.list({ premium: true, limit: 8 });
  return response.data.data.listings || [];
}

// Fetch quartier stats from API (client-side refetch / revalidation)
async function fetchQuartierStats(): Promise<QuartierStat[]> {
  const response = await api.listings.list({ group_by: 'quartier', limit: 100 });
  const listings = response.data.data.listings || [];

  const quartierCounts: Record<string, number> = {};
  listings.forEach((listing: Listing) => {
    const quartier = listing.quartier || 'Autre';
    quartierCounts[quartier] = (quartierCounts[quartier] || 0) + 1;
  });

  return Object.entries(quartierCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

const formatPrice = (price: number | string | undefined | null) => {
  if (price === undefined || price === null) return '0 GNF';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0 GNF';
  return new Intl.NumberFormat('fr-GN').format(num) + ' GNF';
};

// ---------- Property Card (« Argile de Conakry ») ----------
function PropertyCard({ property }: { property: Listing }) {
  const { t } = useTranslations();
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

  const getPhotoUrl = (): string | null => {
    if (property.main_photo_url && property.main_photo_url !== '/images/placeholder.jpg') {
      return property.main_photo_url;
    }
    if (property.photo_principale) return property.photo_principale;
    if (property.photos) {
      if (typeof property.photos === 'string') {
        try {
          const parsed = JSON.parse(property.photos);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
        } catch {
          return null;
        }
      }
      if (Array.isArray(property.photos) && property.photos.length > 0) return property.photos[0];
    }
    return null;
  };

  const photoUrl = getPhotoUrl();

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      className="group bg-white dark:bg-dark-card rounded-2xl border border-neutral-200 dark:border-dark-border shadow-sm hover:shadow-soft-lg hover:border-neutral-300 dark:hover:border-dark-hover transition-all overflow-hidden"
    >
      <Link href={`/bien/${property.id}`}>
        {/* Media */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={property.titre}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-200 to-neutral-100 dark:from-primary-900/40 dark:to-dark-hover" />
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2 z-10">
            {isNew && (
              <span className="px-2.5 py-1 bg-primary-500 text-white text-[11px] font-semibold rounded-full">
                {t('search.badges.new')}
              </span>
            )}
          </div>

          {/* Favorite */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleToggleFavorite}
            aria-label="favori"
            className="absolute top-3 right-3 p-2.5 bg-white/85 dark:bg-dark-card/85 backdrop-blur-sm rounded-full shadow-sm z-10"
          >
            <Heart
              className={`w-[18px] h-[18px] transition-colors ${isFavorite ? 'fill-error-500 text-error-500' : 'text-neutral-600 dark:text-neutral-300'}`}
            />
          </motion.button>

          {/* Price tag */}
          <div className="absolute bottom-3 left-3 z-10">
            <span className="inline-flex items-baseline gap-1 px-3 py-1.5 bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm rounded-lg shadow-sm">
              <span className="font-bold text-neutral-900 dark:text-white tabular-nums">
                {property.formatted_price || formatPrice(property.loyer_mensuel)}
              </span>
              {isLocation && <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">/mois</span>}
              {isLocationCourte && <span className="text-xs font-medium text-teal-600 dark:text-teal-400">/jour</span>}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-primary-600 dark:text-primary-400">
            {property.type_bien}
          </div>
          <h3 className="mt-1 font-semibold text-neutral-900 dark:text-white line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {property.titre}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="line-clamp-1">{property.quartier}, {property.commune}</span>
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-100 dark:border-dark-border text-sm text-neutral-600 dark:text-neutral-300">
            {property.nombre_chambres > 0 && (
              <span className="flex items-center gap-1.5"><BedDouble className="w-4 h-4 text-neutral-400" />{property.nombre_chambres}</span>
            )}
            {property.surface_m2 > 0 && (
              <span className="flex items-center gap-1.5"><Maximize2 className="w-4 h-4 text-neutral-400" />{property.surface_m2} m²</span>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

// ---------- Category tile ----------
function CategoryButton({ icon: Icon, label, href, tint }: { icon: React.ElementType; label: string; href: string; tint: string; }) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
        className="flex flex-col gap-3 p-4 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-2xl cursor-pointer transition-all hover:shadow-soft hover:border-neutral-300 dark:hover:border-dark-hover"
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tint}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-neutral-900 dark:text-white font-semibold text-sm">{label}</span>
      </motion.div>
    </Link>
  );
}

// ---------- Commune tile ----------
function CommuneTile({ name, count, index }: { name: string; count: number; index: number }) {
  const tints = [
    'from-primary-500/25 to-neutral-200 dark:from-primary-900/40 dark:to-dark-hover',
    'from-neutral-200 to-neutral-300 dark:from-dark-hover dark:to-dark-border',
    'from-teal-500/25 to-neutral-200 dark:from-teal-900/40 dark:to-dark-hover',
    'from-neutral-200 to-neutral-300 dark:from-dark-hover dark:to-dark-border',
    'from-success-500/20 to-neutral-200 dark:from-success-900/30 dark:to-dark-hover',
  ];
  return (
    <Link href={`/recherche?commune=${encodeURIComponent(name)}`}>
      <motion.div
        whileHover={{ y: -3 }}
        className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-neutral-200 dark:border-dark-border cursor-pointer group"
      >
        <div className={`absolute inset-0 bg-gradient-to-b ${tints[index % tints.length]}`} />
        <div className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/55 to-transparent">
          <div className="text-white font-semibold">{name}</div>
          {count > 0 && <div className="text-white/85 text-xs tabular-nums">{count} annonces</div>}
        </div>
      </motion.div>
    </Link>
  );
}

export default function HomeClient({
  initialPremiumListings = [],
  initialQuartiers = [],
}: {
  initialPremiumListings?: Listing[];
  initialQuartiers?: QuartierStat[];
}) {
  const router = useRouter();
  const { t } = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyType, setPropertyType] = useState('');

  // Seed React Query with the server-fetched data so the first paint shows real
  // content (no spinner) — ISR HTML ships with these listings baked in. The query
  // still refetches client-side for freshness (staleTime 5/10 min).
  const { data: premiumListings = initialPremiumListings, isLoading: listingsLoading } = useQuery({
    queryKey: ['listings', 'premium'],
    queryFn: fetchPremiumListings,
    initialData: initialPremiumListings,
    staleTime: 5 * 60 * 1000,
  });

  const { data: quartiers = initialQuartiers } = useQuery({
    queryKey: ['quartiers', 'stats'],
    queryFn: fetchQuartierStats,
    initialData: initialQuartiers,
    staleTime: 10 * 60 * 1000,
    placeholderData: CONAKRY_COMMUNES.slice(0, 5).map((name) => ({ name, count: 0 })),
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (propertyType) params.set('type_bien', propertyType);
    router.push(`/recherche?${params.toString()}`);
  };

  const chips: { label: string; href: string }[] = [
    { label: t('home.hero.rental'), href: '/recherche?type_transaction=LOCATION' },
    { label: t('home.hero.purchase'), href: '/recherche?type_transaction=VENTE' },
    { label: t('home.hero.chipFurnished'), href: '/recherche?meuble=1' },
    { label: t('home.hero.chipNew'), href: '/recherche?tri=recent' },
    { label: t('home.hero.chipProtected'), href: '/recherche' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden border-b border-neutral-200 dark:border-dark-border">
        {/* ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 right-[-6rem] w-[36rem] h-[36rem] bg-primary-500/10 dark:bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute -top-32 left-[-8rem] w-[30rem] h-[30rem] bg-teal-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 md:pt-20 md:pb-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <span className="text-xs font-semibold tracking-[0.15em] uppercase text-primary-600 dark:text-primary-400">
              {t('home.hero.eyebrow')}
            </span>
            <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white text-balance leading-[1.08]">
              {t('home.hero.title')}{' '}
              <span className="text-primary-600 dark:text-primary-400">{t('home.hero.titleHighlight')}</span>
            </h1>
            <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl">
              {t('home.hero.subtitle')}
            </p>

            {/* Integrated search */}
            <div className="mt-7 flex flex-wrap gap-2 p-2 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-2xl shadow-soft max-w-2xl">
              <label className="flex-1 min-w-[180px] flex items-center gap-2.5 px-3 py-2 rounded-xl focus-within:bg-neutral-50 dark:focus-within:bg-dark-hover transition-colors">
                <Search className="w-[18px] h-[18px] text-neutral-400 shrink-0" />
                <span className="flex-1">
                  <span className="block text-[10px] font-semibold tracking-wider uppercase text-neutral-400">{t('home.hero.whereLabel')}</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={t('home.hero.searchPlaceholder')}
                    className="w-full bg-transparent border-0 p-0 text-sm font-medium text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-0"
                  />
                </span>
              </label>
              <div className="w-px bg-neutral-200 dark:bg-dark-border my-1.5 hidden sm:block" />
              <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl focus-within:bg-neutral-50 dark:focus-within:bg-dark-hover transition-colors sm:w-44">
                <Building2 className="w-[18px] h-[18px] text-neutral-400 shrink-0" />
                <span className="flex-1">
                  <span className="block text-[10px] font-semibold tracking-wider uppercase text-neutral-400">{t('home.hero.typeLabel')}</span>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full bg-transparent border-0 p-0 text-sm font-medium text-neutral-900 dark:text-white focus:outline-none focus:ring-0"
                  >
                    <option value="">{t('home.hero.allTypes')}</option>
                    <option value="APPARTEMENT">{t('home.categories.apartments')}</option>
                    <option value="MAISON">{t('home.categories.houses')}</option>
                    <option value="BUREAU">{t('home.categories.offices')}</option>
                    <option value="MAGASIN">{t('home.categories.shops')}</option>
                  </select>
                </span>
              </label>
              <button
                onClick={handleSearch}
                className="btn-primary px-5 py-2.5 rounded-xl self-stretch"
              >
                {t('common.search')}
              </button>
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-2 mt-4">
              {chips.map((chip) => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  className="px-3.5 py-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-full hover:border-neutral-300 dark:hover:border-dark-hover hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {chip.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------- CATEGORIES ---------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <CategoryButton icon={Home} label={t('home.categories.apartments')} href="/recherche?type_bien=APPARTEMENT" tint="bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400" />
          <CategoryButton icon={Building2} label={t('home.categories.houses')} href="/recherche?type_bien=MAISON" tint="bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400" />
          <CategoryButton icon={Store} label={t('home.categories.shops')} href="/recherche?type_bien=MAGASIN" tint="bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400" />
          <CategoryButton icon={Briefcase} label={t('home.categories.offices')} href="/recherche?type_bien=BUREAU" tint="bg-neutral-100 text-neutral-600 dark:bg-dark-hover dark:text-neutral-300" />
        </div>
      </section>

      {/* ---------- FEATURED ---------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-semibold tracking-[0.15em] uppercase text-primary-600 dark:text-primary-400">{t('home.featured.eyebrow')}</span>
            <h2 className="mt-1.5 text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">{t('home.premium.title')}</h2>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">{t('home.premium.subtitle')}</p>
          </div>
          <Link href="/recherche?premium=true" className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400 whitespace-nowrap group">
            {t('home.premium.viewAll')}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {listingsLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : premiumListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {premiumListings.slice(0, 6).map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <p className="text-center py-12 text-neutral-500 dark:text-neutral-400">{t('home.premium.noListings')}</p>
        )}

        <div className="mt-6 text-center md:hidden">
          <Link href="/recherche?premium=true" className="btn-primary inline-flex items-center gap-2">
            {t('home.premium.viewAllListings')}<ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ---------- COMMUNES ---------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14">
        <div className="mb-6">
          <span className="text-xs font-semibold tracking-[0.15em] uppercase text-primary-600 dark:text-primary-400">{t('home.communes.eyebrow')}</span>
          <h2 className="mt-1.5 text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">{t('home.quartiers.title')}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {quartiers.map((q, i) => (
            <CommuneTile key={q.name} name={q.name} count={q.count} index={i} />
          ))}
        </div>
      </section>

      {/* ---------- TRUST ---------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Shield, tint: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400', title: t('home.trust.verifiedTitle'), desc: t('home.trust.verifiedDesc') },
            { icon: Lock, tint: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400', title: t('home.trust.depositTitle'), desc: t('home.trust.depositDesc') },
            { icon: MessageCircle, tint: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400', title: t('home.trust.whatsappTitle'), desc: t('home.trust.whatsappDesc') },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex gap-4 p-5 bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-2xl"
            >
              <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${item.tint}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------- ALERTS (empty state) ---------- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-4">
        <div className="mb-6">
          <span className="text-xs font-semibold tracking-[0.15em] uppercase text-primary-600 dark:text-primary-400">{t('home.alerts.eyebrow')}</span>
          <h2 className="mt-1.5 text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">{t('home.alerts.title')}</h2>
        </div>
        <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-dark-border bg-white dark:bg-dark-card px-6 py-12 md:py-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-neutral-100 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border flex items-center justify-center text-neutral-400">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{t('home.alerts.emptyTitle')}</h3>
          <p className="mt-2 max-w-md mx-auto text-neutral-500 dark:text-neutral-400">{t('home.alerts.emptyDesc')}</p>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <Link href="/recherche" className="btn-primary inline-flex items-center gap-2">
              <Bell className="w-4 h-4" />{t('home.alerts.create')}
            </Link>
            <Link href="/recherche" className="btn-secondary inline-flex items-center gap-2">{t('home.alerts.example')}</Link>
          </div>
        </div>
      </section>

      {/* ---------- SEO ---------- */}
      <section className="mt-14 bg-neutral-100 dark:bg-dark-card py-12 border-t border-neutral-200 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-none text-sm">
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-4">{t('seo.home.landingTitle')}</h2>
            <div className="grid md:grid-cols-2 gap-8 text-neutral-600 dark:text-neutral-400">
              <div>
                <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-2">{t('seo.home.landingRental')}</h3>
                <p className="text-sm leading-relaxed mb-4">{t('seo.home.landingRentalContent')}</p>
                <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-2">{t('seo.home.landingShortTerm')}</h3>
                <p className="text-sm leading-relaxed">{t('seo.home.landingShortTermContent')}</p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-2">{t('seo.home.landingSale')}</h3>
                <p className="text-sm leading-relaxed mb-4">{t('seo.home.landingSaleContent')}</p>
                <h3 className="text-base font-semibold text-neutral-700 dark:text-neutral-300 mb-2">{t('seo.home.landingPublish')}</h3>
                <p className="text-sm leading-relaxed">{t('seo.home.landingPublishContent')}</p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-dark-border">
              <p className="text-xs text-neutral-500 dark:text-neutral-500">{t('seo.home.landingCoverage')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}