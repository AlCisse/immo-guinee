import { Metadata } from 'next';
import ListingDetail from './ListingDetail';
import { ListingStructuredData, BreadcrumbStructuredData } from '@/components/seo/StructuredData';

interface Props {
  params: Promise<{ id: string }>;
}

interface ListingData {
  id: number;
  titre: string;
  description?: string;
  prix?: number;
  loyer_mensuel?: number;
  type_transaction: string;
  type_bien: string;
  commune: string;
  quartier: string;
  superficie?: number;
  nombre_chambres?: number;
  nombre_salles_bain?: number;
  main_photo_url?: string;
  listing_photos?: Array<{ url?: string; medium_url?: string; large_url?: string }>;
  created_at: string;
  updated_at: string;
}

async function fetchListing(id: string): Promise<ListingData | null> {
  // For SSR, use internal Docker network URL or public URL as fallback
  // INTERNAL_API_URL is set in Docker for internal service-to-service communication
  const internalApiUrl = process.env.INTERNAL_API_URL || 'http://nginx:80/api';
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://immoguinee.com/api';

  // Try internal URL first (for Docker), fallback to public URL
  const apiUrls = [internalApiUrl, publicApiUrl];

  for (const apiUrl of apiUrls) {
    try {
      const response = await fetch(`${apiUrl}/listings/${id}`, {
        next: { revalidate: 300 }, // Cache for 5 minutes
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.data || data;
      }
    } catch (error) {
      // Try next URL
      continue;
    }
  }

  console.error('Failed to fetch listing from all API URLs');
  return null;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-GN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function getTypeBienLabel(type: string): string {
  const labels: Record<string, string> = {
    STUDIO: 'Studio',
    CHAMBRE_SALON: 'Chambre-Salon',
    APPARTEMENT: 'Appartement',
    APPARTEMENT_2CH: 'Appartement 2 Chambres',
    APPARTEMENT_3CH: 'Appartement 3 Chambres',
    MAISON: 'Maison',
    VILLA: 'Villa',
    DUPLEX: 'Duplex',
    BUREAU: 'Bureau',
    MAGASIN: 'Magasin',
    TERRAIN: 'Terrain',
  };
  return labels[type] || type;
}

function getTransactionLabel(type: string): string {
  const labels: Record<string, string> = {
    LOCATION: 'à louer',
    VENTE: 'à vendre',
    LOCATION_COURTE: 'location courte durée',
  };
  return labels[type?.toUpperCase()] || type;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchListing(id);
  const url = `https://immoguinee.com/annonces/${id}`;

  // Fallback metadata if listing not found
  if (!listing) {
    return {
      title: `Annonce immobilière ${id} | ImmoGuinée`,
      description: 'Découvrez cette annonce immobilière en Guinée. Location et vente de biens immobiliers à Conakry.',
      alternates: { canonical: url },
      robots: { index: false, follow: true },
    };
  }

  // Build dynamic SEO metadata
  const typeBien = getTypeBienLabel(listing.type_bien);
  const transaction = getTransactionLabel(listing.type_transaction);
  const price = listing.prix || listing.loyer_mensuel;
  const priceText = price ? `${formatPrice(price)} GNF` : '';
  const location = `${listing.quartier}, ${listing.commune}`;

  // Title: "Villa 4 chambres à louer à Kipé, Ratoma - 5.000.000 GNF | ImmoGuinée"
  const title = listing.titre
    ? `${listing.titre} ${transaction} - ${priceText} | ImmoGuinée`
    : `${typeBien} ${transaction} à ${location} - ${priceText} | ImmoGuinée`;

  // Description: Include key details for CTR
  const superficie = listing.superficie ? `${listing.superficie}m²` : '';
  const chambres = listing.nombre_chambres ? `${listing.nombre_chambres} chambres` : '';
  const features = [superficie, chambres].filter(Boolean).join(', ');

  const description = listing.description
    ? listing.description.substring(0, 155) + '...'
    : `${typeBien} ${transaction} à ${location}. ${features}. ${priceText}. Contactez le propriétaire sur ImmoGuinée.`;

  // Get image for social sharing
  const imageUrl =
    listing.main_photo_url ||
    listing.listing_photos?.[0]?.large_url ||
    listing.listing_photos?.[0]?.medium_url ||
    listing.listing_photos?.[0]?.url ||
    'https://immoguinee.com/images/banner-hero.jpg';

  return {
    title,
    description,
    keywords: [
      listing.type_bien?.toLowerCase(),
      transaction,
      listing.quartier,
      listing.commune,
      'immobilier Guinée',
      'Conakry',
    ].filter(Boolean),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'fr_GN',
      url,
      siteName: 'ImmoGuinée',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: listing.titre || `${typeBien} à ${location}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  const listing = await fetchListing(id);

  // Breadcrumb data for structured data
  const breadcrumbs = [
    { name: 'Accueil', url: 'https://immoguinee.com' },
    { name: 'Annonces', url: 'https://immoguinee.com/annonces' },
    { name: listing?.titre || `Annonce ${id}`, url: `https://immoguinee.com/annonces/${id}` },
  ];

  return (
    <>
      {/* Structured Data for SEO */}
      <BreadcrumbStructuredData items={breadcrumbs} />
      {listing && (
        <ListingStructuredData
          listing={{
            id: String(listing.id),
            titre: listing.titre,
            prix: listing.prix || listing.loyer_mensuel,
            commune: listing.commune,
            quartier: listing.quartier,
            superficie: listing.superficie,
            nombreChambres: listing.nombre_chambres,
            nombreSallesDeBain: listing.nombre_salles_bain,
            createdAt: listing.created_at,
          }}
        />
      )}
      <ListingDetail listingId={id} />
    </>
  );
}
