import { MetadataRoute } from 'next';

// Force dynamic rendering - sitemap will be generated at request time
export const dynamic = 'force-dynamic';

interface ListingForSitemap {
  id: string;
  updated_at: string;
  type_transaction: string;
}

async function fetchAllListings(): Promise<ListingForSitemap[]> {
  // For SSR, use internal Docker network URL or public URL as fallback
  const internalApiUrl = process.env.INTERNAL_API_URL || 'http://nginx:80/api';
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://immoguinee.com/api';

  const apiUrls = [internalApiUrl, publicApiUrl];

  for (const apiUrl of apiUrls) {
    try {
      const response = await fetch(`${apiUrl}/listings?statut=ACTIVE&limit=1000`, {
        next: { revalidate: 3600 }, // Revalidate every hour
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // API returns { success: true, data: { listings: [...], pagination: {...} } }
        return data.data?.listings || [];
      }
    } catch (error) {
      // Try next URL
      continue;
    }
  }

  console.error('Failed to fetch listings for sitemap from all API URLs');
  return [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://immoguinee.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/annonces`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/recherche`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/publier`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/location-courte-duree`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9, // High priority for short-term rental landing page
    },
    {
      url: `${baseUrl}/estimer`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/aide`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/legal/conditions-utilisation`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/politique-confidentialite`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Fetch all active listings dynamically
  const listings = await fetchAllListings();

  const listingPages: MetadataRoute.Sitemap = listings.map((listing) => ({
    url: `${baseUrl}/annonces/${listing.id}`,
    lastModified: new Date(listing.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Search pages by transaction type (high priority for SEO)
  const transactionTypes = [
    { type: 'LOCATION', priority: 0.85 },
    { type: 'LOCATION_COURTE', priority: 0.85 }, // Short-term rental - high priority
    { type: 'VENTE', priority: 0.85 },
  ];
  const transactionPages: MetadataRoute.Sitemap = transactionTypes.map(({ type, priority }) => ({
    url: `${baseUrl}/recherche?type_transaction=${type}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority,
  }));

  // Communes de Conakry
  const communes = ['Kaloum', 'Dixinn', 'Matam', 'Ratoma', 'Matoto'];

  // Quartiers populaires par commune (très important pour le SEO local)
  const quartiersPopulaires = [
    // Ratoma
    'Kipé', 'Nongo', 'Taouyah', 'Kaporo', 'Lambanyi', 'Cosa', 'Sonfonia', 'Koloma',
    // Kaloum
    'Almamya', 'Boulbinet', 'Coronthie', 'Tombo', 'Sandervalia',
    // Dixinn
    'Belle-Vue', 'Cameroun', 'Landréah', 'Minière', 'Université',
    // Matam
    'Madina', 'Hamdallaye', 'Bonfi', 'Hermakono', 'Matam-marché',
    // Matoto
    'Sangoyah', 'Dabompa', 'Yimbaya', 'Enta', 'Cité-de-lair',
  ];

  // Search pages by commune
  const communePages: MetadataRoute.Sitemap = communes.map((commune) => ({
    url: `${baseUrl}/recherche?commune=${commune}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  // Search pages by quartier populaire (high priority for local SEO)
  const quartierPages: MetadataRoute.Sitemap = quartiersPopulaires.map((quartier) => ({
    url: `${baseUrl}/recherche?quartier=${quartier}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.65,
  }));

  // Location courte durée by commune (high value SEO pages)
  const shortTermByCommune: MetadataRoute.Sitemap = communes.map((commune) => ({
    url: `${baseUrl}/recherche?type_transaction=LOCATION_COURTE&commune=${commune}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.75,
  }));

  // Types de biens
  const propertyTypes = ['APPARTEMENT', 'MAISON', 'VILLA', 'STUDIO', 'DUPLEX', 'BUREAU', 'MAGASIN', 'TERRAIN', 'CHAMBRE_SALON'];

  // Search pages by property type
  const propertyTypePages: MetadataRoute.Sitemap = propertyTypes.map((type) => ({
    url: `${baseUrl}/recherche?type_bien=${type}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  // Location longue durée by property type
  const locationByType: MetadataRoute.Sitemap = propertyTypes.filter(t => t !== 'TERRAIN').map((type) => ({
    url: `${baseUrl}/recherche?type_transaction=LOCATION&type_bien=${type}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.65,
  }));

  // Vente by property type
  const venteByType: MetadataRoute.Sitemap = propertyTypes.map((type) => ({
    url: `${baseUrl}/recherche?type_transaction=VENTE&type_bien=${type}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.65,
  }));

  // Short-term rental by property type (meublé apartments, villas)
  const shortTermPropertyTypes = ['APPARTEMENT', 'VILLA', 'STUDIO', 'CHAMBRE_SALON'];
  const shortTermByType: MetadataRoute.Sitemap = shortTermPropertyTypes.map((type) => ({
    url: `${baseUrl}/recherche?type_transaction=LOCATION_COURTE&type_bien=${type}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  // Combinaisons populaires: Type de bien + Commune (high value for SEO)
  const popularCombinations: MetadataRoute.Sitemap = [];
  const mainTypes = ['APPARTEMENT', 'VILLA', 'MAISON', 'TERRAIN'];
  const mainTransactions = ['LOCATION', 'VENTE'];

  for (const type of mainTypes) {
    for (const commune of communes) {
      // Location par type et commune
      if (type !== 'TERRAIN') {
        popularCombinations.push({
          url: `${baseUrl}/recherche?type_transaction=LOCATION&type_bien=${type}&commune=${commune}`,
          lastModified: new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.6,
        });
      }
      // Vente par type et commune
      popularCombinations.push({
        url: `${baseUrl}/recherche?type_transaction=VENTE&type_bien=${type}&commune=${commune}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.6,
      });
    }
  }

  // Location meublée dans quartiers premium
  const premiumQuartiers = ['Kipé', 'Nongo', 'Taouyah', 'Lambanyi', 'Almamya'];
  const shortTermPremiumQuartiers: MetadataRoute.Sitemap = premiumQuartiers.map((quartier) => ({
    url: `${baseUrl}/recherche?type_transaction=LOCATION_COURTE&quartier=${quartier}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...listingPages,
    ...transactionPages,
    ...communePages,
    ...quartierPages,
    ...shortTermByCommune,
    ...propertyTypePages,
    ...locationByType,
    ...venteByType,
    ...shortTermByType,
    ...popularCombinations,
    ...shortTermPremiumQuartiers,
  ];
}
