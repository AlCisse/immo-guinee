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
    alternateName: ['Immo Guinée', 'ImmoGuinee', 'Immobilier Guinée'],
    description: 'Plateforme immobilière N°1 en Guinée. Location appartement meublé, villa, maison à Conakry. Vente terrain avec titre foncier. Annonces gratuites à Kipé, Ratoma, Kaloum, Dixinn, Matam, Matoto. Location courte durée pour expatriés.',
    url: 'https://immoguinee.com',
    logo: 'https://immoguinee.com/images/logo.png',
    image: 'https://immoguinee.com/images/banner-hero.jpg',
    foundingDate: '2024',
    slogan: 'Trouvez votre logement idéal en Guinée',
    knowsAbout: [
      'Location appartement Conakry',
      'Vente terrain Guinée',
      'Location meublée Conakry',
      'Immobilier Kipé',
      'Villa à louer Ratoma',
      'Terrain avec titre foncier',
      'Location courte durée expatrié',
    ],
    areaServed: [
      { '@type': 'Country', name: 'Guinée' },
      { '@type': 'City', name: 'Conakry' },
    ],
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
    alternateName: 'Immobilier Guinée Conakry',
    description: 'Plateforme immobilière N°1 en Guinée. Location appartement meublé, villa, maison. Vente terrain avec titre foncier. Location courte durée pour expatriés et professionnels. Annonces gratuites à Conakry.',
    url: 'https://immoguinee.com',
    logo: 'https://immoguinee.com/images/logo.png',
    image: 'https://immoguinee.com/images/banner-hero.jpg',
    telephone: '+224-664-09-64-62',
    priceRange: 'GNF',
    currenciesAccepted: 'GNF, USD, EUR',
    paymentAccepted: 'Cash, Mobile Money, Virement bancaire',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Conakry',
      addressRegion: 'Conakry',
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
      // Quartiers populaires
      { '@type': 'Place', name: 'Kipé' },
      { '@type': 'Place', name: 'Nongo' },
      { '@type': 'Place', name: 'Taouyah' },
      { '@type': 'Place', name: 'Lambanyi' },
      { '@type': 'Place', name: 'Almamya' },
      { '@type': 'Place', name: 'Madina' },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services immobiliers',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Location longue durée',
            description: 'Location appartement, villa, maison à Conakry',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Location courte durée',
            description: 'Location meublée pour expatriés et professionnels',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Vente immobilière',
            description: 'Vente terrain, parcelle, maison, villa avec titre foncier',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Annonces gratuites',
            description: 'Publication gratuite d\'annonces immobilières en Guinée',
          },
        },
      ],
    },
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
