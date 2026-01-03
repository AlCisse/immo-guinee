import { NextResponse } from 'next/server';

// Force dynamic rendering - sitemap will be generated at request time
export const dynamic = 'force-dynamic';

interface ListingForSitemap {
  id: string;
  updated_at: string;
  type_transaction: string;
}

interface SitemapEntry {
  url: string;
  lastModified: Date;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

async function fetchAllListings(): Promise<ListingForSitemap[]> {
  const internalApiUrl = process.env.INTERNAL_API_URL || 'http://nginx:80/api';
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://immoguinee.com/api';
  const apiUrls = [internalApiUrl, publicApiUrl];

  for (const apiUrl of apiUrls) {
    try {
      const response = await fetch(`${apiUrl}/listings?statut=ACTIVE&limit=1000`, {
        next: { revalidate: 3600 },
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        return data.data?.listings || [];
      }
    } catch {
      continue;
    }
  }

  console.error('Failed to fetch listings for sitemap from all API URLs');
  return [];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateSitemapXml(entries: SitemapEntry[]): string {
  const urlEntries = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${entry.lastModified.toISOString()}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

export async function GET(): Promise<NextResponse> {
  const baseUrl = 'https://immoguinee.com';

  // Static pages
  const staticPages: SitemapEntry[] = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/annonces`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/recherche`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/publier`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/location-courte-duree`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/estimer`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/aide`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/legal/conditions-utilisation`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/legal/politique-confidentialite`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Fetch all active listings dynamically
  const listings = await fetchAllListings();
  const listingPages: SitemapEntry[] = listings.map((listing) => ({
    url: `${baseUrl}/annonces/${listing.id}`,
    lastModified: new Date(listing.updated_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Search pages by transaction type
  const transactionTypes = [
    { type: 'LOCATION', priority: 0.85 },
    { type: 'LOCATION_COURTE', priority: 0.85 },
    { type: 'VENTE', priority: 0.85 },
  ];
  const transactionPages: SitemapEntry[] = transactionTypes.map(({ type, priority }) => ({
    url: `${baseUrl}/recherche?type_transaction=${type}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority,
  }));

  // Communes de Conakry
  const communes = ['Kaloum', 'Dixinn', 'Matam', 'Ratoma', 'Matoto'];
  const communePages: SitemapEntry[] = communes.map((commune) => ({
    url: `${baseUrl}/recherche?commune=${commune}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  // Quartiers populaires
  const quartiersPopulaires = [
    'Kipé', 'Nongo', 'Taouyah', 'Kaporo', 'Lambanyi', 'Cosa', 'Sonfonia', 'Koloma',
    'Almamya', 'Boulbinet', 'Coronthie', 'Tombo', 'Sandervalia',
    'Belle-Vue', 'Cameroun', 'Landréah', 'Minière', 'Université',
    'Madina', 'Hamdallaye', 'Bonfi', 'Hermakono', 'Matam-marché',
    'Sangoyah', 'Dabompa', 'Yimbaya', 'Enta', 'Cité-de-lair',
  ];
  const quartierPages: SitemapEntry[] = quartiersPopulaires.map((quartier) => ({
    url: `${baseUrl}/recherche?quartier=${quartier}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.65,
  }));

  // Location courte durée by commune
  const shortTermByCommune: SitemapEntry[] = communes.map((commune) => ({
    url: `${baseUrl}/recherche?type_transaction=LOCATION_COURTE&commune=${commune}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.75,
  }));

  // Types de biens
  const propertyTypes = ['APPARTEMENT', 'MAISON', 'VILLA', 'STUDIO', 'DUPLEX', 'BUREAU', 'MAGASIN', 'TERRAIN', 'CHAMBRE_SALON'];
  const propertyTypePages: SitemapEntry[] = propertyTypes.map((type) => ({
    url: `${baseUrl}/recherche?type_bien=${type}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  // Location by property type
  const locationByType: SitemapEntry[] = propertyTypes
    .filter((t) => t !== 'TERRAIN')
    .map((type) => ({
      url: `${baseUrl}/recherche?type_transaction=LOCATION&type_bien=${type}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.65,
    }));

  // Vente by property type
  const venteByType: SitemapEntry[] = propertyTypes.map((type) => ({
    url: `${baseUrl}/recherche?type_transaction=VENTE&type_bien=${type}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.65,
  }));

  // Short-term rental by property type
  const shortTermPropertyTypes = ['APPARTEMENT', 'VILLA', 'STUDIO', 'CHAMBRE_SALON'];
  const shortTermByType: SitemapEntry[] = shortTermPropertyTypes.map((type) => ({
    url: `${baseUrl}/recherche?type_transaction=LOCATION_COURTE&type_bien=${type}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  // Popular combinations: property type + commune
  const popularCombinations: SitemapEntry[] = [];
  const mainTypes = ['APPARTEMENT', 'VILLA', 'MAISON', 'TERRAIN'];

  for (const type of mainTypes) {
    for (const commune of communes) {
      if (type !== 'TERRAIN') {
        popularCombinations.push({
          url: `${baseUrl}/recherche?type_transaction=LOCATION&type_bien=${type}&commune=${commune}`,
          lastModified: new Date(),
          changeFrequency: 'daily',
          priority: 0.6,
        });
      }
      popularCombinations.push({
        url: `${baseUrl}/recherche?type_transaction=VENTE&type_bien=${type}&commune=${commune}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.6,
      });
    }
  }

  // Premium quartiers for short-term
  const premiumQuartiers = ['Kipé', 'Nongo', 'Taouyah', 'Lambanyi', 'Almamya'];
  const shortTermPremiumQuartiers: SitemapEntry[] = premiumQuartiers.map((quartier) => ({
    url: `${baseUrl}/recherche?type_transaction=LOCATION_COURTE&quartier=${quartier}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const allEntries: SitemapEntry[] = [
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

  const xml = generateSitemapXml(allEntries);

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
