import { MetadataRoute } from 'next';

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

  // Search pages by commune (for SEO targeting local searches)
  const communes = ['Kaloum', 'Dixinn', 'Matam', 'Ratoma', 'Matoto'];
  const communePages: MetadataRoute.Sitemap = communes.map((commune) => ({
    url: `${baseUrl}/recherche?commune=${commune}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  // Search pages by property type
  const propertyTypes = ['APPARTEMENT', 'MAISON', 'VILLA', 'BUREAU', 'MAGASIN', 'TERRAIN'];
  const propertyTypePages: MetadataRoute.Sitemap = propertyTypes.map((type) => ({
    url: `${baseUrl}/recherche?type_bien=${type}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...listingPages, ...communePages, ...propertyTypePages];
}
