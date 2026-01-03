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
    description: 'La plus grande plateforme immobilière de Guinée. Trouvez des maisons, appartements et terrains à louer ou à vendre à Conakry et partout en Guinée.',
    url: 'https://immoguinee.com',
    logo: 'https://immoguinee.com/images/logo.png',
    image: 'https://immoguinee.com/images/banner-hero.jpg',
    foundingDate: '2024',
    areaServed: {
      '@type': 'Country',
      name: 'Guinée',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+224-664-09-64-62',
      contactType: 'customer service',
      availableLanguage: ['fr', 'en'],
      areaServed: 'GN',
    },
    sameAs: [
      'https://facebook.com/immoguinee',
      'https://twitter.com/immoguinee',
      'https://instagram.com/immoguinee',
    ],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Conakry',
      addressCountry: 'GN',
    },
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

export function WebSiteStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ImmoGuinée',
    alternateName: 'Immo Guinée',
    url: 'https://immoguinee.com',
    description: 'La plateforme immobilière de référence en Guinée',
    inLanguage: 'fr-GN',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://immoguinee.com/recherche?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function LocalBusinessStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: 'ImmoGuinée',
    description: 'Agence immobilière en ligne - Location et vente de biens immobiliers en Guinée',
    url: 'https://immoguinee.com',
    logo: 'https://immoguinee.com/images/logo.png',
    image: 'https://immoguinee.com/images/banner-hero.jpg',
    telephone: '+224-664-09-64-62',
    priceRange: 'GNF',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Conakry',
      addressCountry: 'GN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 9.6412,
      longitude: -13.5784,
    },
    areaServed: [
      { '@type': 'City', name: 'Conakry' },
      { '@type': 'AdministrativeArea', name: 'Kaloum' },
      { '@type': 'AdministrativeArea', name: 'Dixinn' },
      { '@type': 'AdministrativeArea', name: 'Matam' },
      { '@type': 'AdministrativeArea', name: 'Ratoma' },
      { '@type': 'AdministrativeArea', name: 'Matoto' },
    ],
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '08:00',
      closes: '18:00',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
