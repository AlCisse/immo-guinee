import type { Metadata } from 'next';
import { cache } from 'react';
import { api } from '@/lib/api/client';
import PropertyDetailClient, { type Listing } from './PropertyDetailClient';

// P3 — la fiche bien est un Server Component. L'annonce est fetchée côté serveur
// (données publiques, pas de cookie requis) puis passée en `initialData` au
// composant client (PropertyDetailClient) qui gère l'interactivité (galerie,
// favoris, visite, contact). ISR : `revalidate = 300` régénère la page toutes les
// 5 min — première visite à froid = génération + cache, visites suivantes =
// cache CDN instantané. SEO : `generateMetadata` produit un title/description/
// OpenGraph par annonce (avant : metadata générique du layout racine uniquement).
export const revalidate = 300;

// `cache()` déduplique le fetch entre generateMetadata et le rendu de la page
// lors d'une même requête (Next les appelle séparément mais dans le même pass).
const getListing = cache(async (id: string): Promise<Listing | null> => {
  try {
    const res = await api.listings.get(id);
    return (res.data?.data as Listing) ?? null;
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) {
    return {};
  }

  const title = listing.titre
    ? `${listing.titre} — ImmoGuinée`
    : 'Annonce immobilière — ImmoGuinée';
  const description =
    (listing.description?.slice(0, 160) ?? undefined) ||
    `Annonce immobilière à ${listing.commune ?? 'Conakry'}${listing.quartier ? `, ${listing.quartier}` : ''} sur ImmoGuinée.`;
  const image = listing.main_photo_url || listing.photo_principale || undefined;
  const url = `https://immoguinee.com/bien/${id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'ImmoGuinée',
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: listing.titre ?? 'Annonce ImmoGuinée' }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialListing = await getListing(id);

  return <PropertyDetailClient id={id} initialListing={initialListing ?? undefined} />;
}