import { MetadataRoute } from 'next';

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
      url: `${baseUrl}/publier`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  // In production, fetch listing IDs from API and add them dynamically
  // For now, return static pages
  // Example:
  // const listings = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listings`).then(res => res.json());
  // const listingPages = listings.data.map((listing) => ({
  //   url: `${baseUrl}/annonces/${listing.id}`,
  //   lastModified: new Date(listing.updated_at),
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.7,
  // }));

  return [...staticPages];
}
