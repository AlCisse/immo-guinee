import type { Listing } from '@/components/listings/ListingCard';

interface ListingStructuredDataProps {
  listing: Listing;
}

export function ListingStructuredData({ listing }: ListingStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.titre,
    description: listing.titre,
    url: `https://immoguinee.com/annonces/${listing.id}`,
    offers: {
      '@type': 'Offer',
      price: listing.prix,
      priceCurrency: 'GNF',
      availability: 'https://schema.org/InStock',
      priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: listing.quartier,
      addressRegion: listing.commune,
      addressCountry: 'GN',
    },
    floorSize: {
      '@type': 'QuantitativeValue',
      value: listing.superficie,
      unitCode: 'MTK',
    },
    numberOfRooms: listing.nombreChambres,
    numberOfBathroomsTotal: listing.nombreSallesDeBain,
    datePosted: listing.createdAt,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function OrganizationStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ImmoGuinée',
    description: 'La plus grande plateforme immobilière de Guinée',
    url: 'https://immoguinee.com',
    logo: 'https://immoguinee.com/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+224-XXX-XXX-XXX',
      contactType: 'customer service',
      availableLanguage: ['fr', 'en'],
    },
    sameAs: [
      'https://facebook.com/immoguinee',
      'https://twitter.com/immoguinee',
      'https://instagram.com/immoguinee',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function BreadcrumbStructuredData({ items }: { items: Array<{ name: string; url: string }> }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
