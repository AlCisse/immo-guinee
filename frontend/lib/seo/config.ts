import { Metadata } from 'next';

// Base URL for canonical links
export const BASE_URL = 'https://immoguinee.com';

// Default SEO configuration
export const DEFAULT_SEO = {
  siteName: 'ImmoGuinee',
  defaultTitle: 'ImmoGuinee - Location & Vente Immobilier Conakry, Guinee',
  titleTemplate: '%s | ImmoGuinee',
  locale: 'fr_GN',
  alternateLocale: 'en_US',
};

// Structured keywords by category for SEO optimization
export const SEO_KEYWORDS = {
  // Primary keywords (high search volume)
  primary: {
    fr: [
      'immobilier Guinee',
      'immobilier Conakry',
      'location appartement Conakry',
      'maison a vendre Guinee',
      'terrain a vendre Conakry',
      'agence immobiliere Guinee',
    ],
    en: [
      'real estate Guinea',
      'property Conakry',
      'apartment for rent Conakry',
      'house for sale Guinea',
      'land for sale Conakry',
      'real estate agency Guinea',
    ],
  },
  // Location-based keywords
  locations: {
    communes: ['Kaloum', 'Dixinn', 'Matam', 'Ratoma', 'Matoto'],
    quartiers: [
      'Kipe', 'Nongo', 'Taouyah', 'Kaporo', 'Lambanyi',
      'Almamya', 'Boulbinet', 'Madina', 'Hamdallaye',
      'Belle-Vue', 'Cameroun', 'Miniere',
    ],
  },
  // Property type keywords
  propertyTypes: {
    fr: [
      'appartement', 'villa', 'maison', 'studio', 'duplex',
      'terrain', 'bureau', 'magasin', 'entrepot', 'chambre salon',
    ],
    en: [
      'apartment', 'villa', 'house', 'studio', 'duplex',
      'land', 'office', 'shop', 'warehouse', 'room',
    ],
  },
  // Transaction type keywords
  transactions: {
    fr: ['location', 'vente', 'achat', 'louer', 'acheter', 'location courte duree', 'meuble'],
    en: ['rental', 'sale', 'purchase', 'rent', 'buy', 'short-term rental', 'furnished'],
  },
  // Feature keywords
  features: {
    fr: [
      'climatisation', 'piscine', 'groupe electrogene', 'forage',
      'securite 24h', 'meuble', 'parking', 'titre foncier',
    ],
    en: [
      'air conditioning', 'pool', 'generator', 'borehole',
      '24h security', 'furnished', 'parking', 'land title',
    ],
  },
  // Long-tail keywords
  longTail: {
    fr: [
      'appartement meuble a louer Conakry',
      'villa avec piscine Kipe',
      'terrain avec titre foncier Ratoma',
      'location courte duree expatrie Guinee',
      'maison a louer Madina',
      'studio meuble Conakry centre',
      'bureau a louer Kaloum',
      'investissement immobilier Guinee',
    ],
    en: [
      'furnished apartment for rent Conakry',
      'villa with pool Kipe',
      'land with title deed Ratoma',
      'short-term rental expat Guinea',
      'house for rent Madina',
      'furnished studio downtown Conakry',
      'office for rent Kaloum',
      'real estate investment Guinea',
    ],
  },
};

// Page-specific SEO configurations
export const PAGE_SEO: Record<string, { fr: Metadata; en: Metadata }> = {
  home: {
    fr: {
      title: 'ImmoGuinee - Location & Vente Immobilier a Conakry, Guinee',
      description: 'Plateforme immobiliere N1 en Guinee. Location appartement meuble, villa, maison a Conakry. Vente terrain avec titre foncier. Annonces gratuites Kipe, Ratoma, Kaloum, Dixinn, Matam, Matoto.',
      keywords: [
        'immobilier Guinee', 'immobilier Conakry', 'location appartement Conakry',
        'maison a vendre Guinee', 'terrain a vendre', 'villa a louer Conakry',
        'agence immobiliere Conakry', 'location meublee Guinee', 'annonces immobilieres',
      ],
      openGraph: {
        title: 'ImmoGuinee - Immobilier N1 en Guinee',
        description: 'Trouvez votre logement ideal a Conakry. Location, vente, courte duree.',
        type: 'website',
        locale: 'fr_GN',
        siteName: 'ImmoGuinee',
        url: BASE_URL,
        images: [{ url: `${BASE_URL}/images/banner-hero.jpg`, width: 1200, height: 630 }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'ImmoGuinee - Location & Vente Immobilier Guinee',
        description: 'La plateforme immobiliere de reference en Guinee',
      },
      alternates: {
        canonical: BASE_URL,
        languages: { 'en': `${BASE_URL}/en`, 'fr': BASE_URL },
      },
    },
    en: {
      title: 'ImmoGuinee - Real Estate Rental & Sale in Conakry, Guinea',
      description: 'Guinea\'s #1 real estate platform. Furnished apartments, villas, houses for rent in Conakry. Land for sale with title deed. Free listings in Kipe, Ratoma, Kaloum, Dixinn, Matam, Matoto.',
      keywords: [
        'real estate Guinea', 'property Conakry', 'apartment for rent Conakry',
        'house for sale Guinea', 'land for sale', 'villa for rent Conakry',
        'real estate agency Conakry', 'furnished rental Guinea', 'property listings',
      ],
      openGraph: {
        title: 'ImmoGuinee - #1 Real Estate in Guinea',
        description: 'Find your ideal home in Conakry. Rental, sale, short-term stays.',
        type: 'website',
        locale: 'en_US',
        siteName: 'ImmoGuinee',
        url: `${BASE_URL}/en`,
        images: [{ url: `${BASE_URL}/images/banner-hero.jpg`, width: 1200, height: 630 }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'ImmoGuinee - Real Estate Rental & Sale Guinea',
        description: 'The leading real estate platform in Guinea',
      },
      alternates: {
        canonical: `${BASE_URL}/en`,
        languages: { 'en': `${BASE_URL}/en`, 'fr': BASE_URL },
      },
    },
  },
  search: {
    fr: {
      title: 'Recherche Immobilier Conakry - Appartements, Maisons, Terrains',
      description: 'Recherchez parmi des milliers d\'annonces immobilieres en Guinee. Filtrez par quartier, type de bien, prix. Location et vente a Conakry: Kipe, Ratoma, Kaloum, Madina.',
      keywords: [
        'recherche immobilier Conakry', 'annonces immobilieres Guinee',
        'appartement Kipe', 'maison Ratoma', 'terrain Matoto',
        'location Kaloum', 'vente immobilier Dixinn',
      ],
    },
    en: {
      title: 'Search Real Estate Conakry - Apartments, Houses, Land',
      description: 'Browse thousands of real estate listings in Guinea. Filter by neighborhood, property type, price. Rental and sale in Conakry: Kipe, Ratoma, Kaloum, Madina.',
      keywords: [
        'search real estate Conakry', 'property listings Guinea',
        'apartment Kipe', 'house Ratoma', 'land Matoto',
        'rental Kaloum', 'sale property Dixinn',
      ],
    },
  },
  shortTermRental: {
    fr: {
      title: 'Location Courte Duree Conakry - Appartements Meubles, Villas',
      description: 'Location meublee courte duree a Conakry pour expatries, voyageurs d\'affaires, touristes. Appartements et villas tout equipes a Kipe, Nongo, Taouyah. Wifi, securite, menage inclus.',
      keywords: [
        'location courte duree Conakry', 'appartement meuble Guinee',
        'airbnb Conakry', 'logement expatrie Guinee', 'villa meublee Kipe',
        'hebergement Conakry', 'court sejour Guinee', 'location temporaire',
      ],
    },
    en: {
      title: 'Short-Term Rental Conakry - Furnished Apartments, Villas',
      description: 'Furnished short-term rentals in Conakry for expats, business travelers, tourists. Fully equipped apartments and villas in Kipe, Nongo, Taouyah. WiFi, security, cleaning included.',
      keywords: [
        'short-term rental Conakry', 'furnished apartment Guinea',
        'airbnb Conakry', 'expat housing Guinea', 'furnished villa Kipe',
        'accommodation Conakry', 'temporary stay Guinea', 'vacation rental',
      ],
    },
  },
  publish: {
    fr: {
      title: 'Publier une Annonce Immobiliere Gratuite - ImmoGuinee',
      description: 'Publiez gratuitement votre annonce immobiliere en Guinee. Location ou vente, touchez des milliers d\'acheteurs et locataires potentiels a Conakry. Publication simple et rapide.',
      keywords: [
        'publier annonce immobiliere', 'annonce gratuite Guinee',
        'vendre maison Conakry', 'louer appartement', 'depot annonce immobilier',
      ],
    },
    en: {
      title: 'Post Free Real Estate Listing - ImmoGuinee',
      description: 'Post your real estate listing for free in Guinea. Rental or sale, reach thousands of potential buyers and tenants in Conakry. Simple and fast publishing.',
      keywords: [
        'post property listing', 'free listing Guinea',
        'sell house Conakry', 'rent apartment', 'submit real estate ad',
      ],
    },
  },
  estimate: {
    fr: {
      title: 'Estimation Immobiliere Gratuite Conakry - Prix m2 Guinee',
      description: 'Estimez gratuitement la valeur de votre bien immobilier a Conakry. Prix au m2 par quartier, estimation precise pour location et vente. Kipe, Ratoma, Kaloum, Madina.',
      keywords: [
        'estimation immobiliere Conakry', 'prix m2 Guinee', 'evaluer maison',
        'estimation appartement', 'prix immobilier Conakry', 'valeur terrain',
      ],
    },
    en: {
      title: 'Free Property Valuation Conakry - Price per m2 Guinea',
      description: 'Get a free property valuation in Conakry. Price per m2 by neighborhood, accurate estimates for rental and sale. Kipe, Ratoma, Kaloum, Madina.',
      keywords: [
        'property valuation Conakry', 'price per m2 Guinea', 'house appraisal',
        'apartment estimate', 'real estate prices Conakry', 'land value',
      ],
    },
  },
  contact: {
    fr: {
      title: 'Contactez ImmoGuinee - Support Immobilier Conakry',
      description: 'Contactez l\'equipe ImmoGuinee pour toute question sur vos annonces, location ou vente immobiliere en Guinee. Support par WhatsApp, email, telephone.',
      keywords: [
        'contact ImmoGuinee', 'support immobilier Guinee', 'aide annonces',
        'agence immobiliere Conakry contact', 'service client immobilier',
      ],
    },
    en: {
      title: 'Contact ImmoGuinee - Real Estate Support Conakry',
      description: 'Contact the ImmoGuinee team for any questions about your listings, rental or sale in Guinea. Support via WhatsApp, email, phone.',
      keywords: [
        'contact ImmoGuinee', 'real estate support Guinea', 'listing help',
        'real estate agency Conakry contact', 'customer service property',
      ],
    },
  },
  help: {
    fr: {
      title: 'Centre d\'Aide ImmoGuinee - FAQ Immobilier Guinee',
      description: 'Trouvez des reponses a toutes vos questions sur ImmoGuinee. Comment publier une annonce, eviter les arnaques, contacter un proprietaire. Guide complet immobilier Guinee.',
      keywords: [
        'aide ImmoGuinee', 'FAQ immobilier Guinee', 'comment publier annonce',
        'eviter arnaques immobilier', 'guide location Conakry',
      ],
    },
    en: {
      title: 'ImmoGuinee Help Center - Real Estate FAQ Guinea',
      description: 'Find answers to all your questions about ImmoGuinee. How to post a listing, avoid scams, contact an owner. Complete real estate guide Guinea.',
      keywords: [
        'ImmoGuinee help', 'real estate FAQ Guinea', 'how to post listing',
        'avoid property scams', 'rental guide Conakry',
      ],
    },
  },
  login: {
    fr: {
      title: 'Connexion - ImmoGuinee',
      description: 'Connectez-vous a votre compte ImmoGuinee pour gerer vos annonces, favoris et messages. Acces securise a la plateforme immobiliere N1 en Guinee.',
    },
    en: {
      title: 'Login - ImmoGuinee',
      description: 'Log in to your ImmoGuinee account to manage your listings, favorites and messages. Secure access to Guinea\'s #1 real estate platform.',
    },
  },
  register: {
    fr: {
      title: 'Inscription Gratuite - ImmoGuinee',
      description: 'Creez votre compte gratuit ImmoGuinee. Publiez des annonces, sauvegardez vos favoris, contactez les proprietaires. Rejoignez la communaute immobiliere en Guinee.',
      keywords: [
        'inscription ImmoGuinee', 'creer compte immobilier',
        'compte gratuit annonces', 'rejoindre ImmoGuinee',
      ],
    },
    en: {
      title: 'Free Registration - ImmoGuinee',
      description: 'Create your free ImmoGuinee account. Post listings, save favorites, contact owners. Join the real estate community in Guinea.',
      keywords: [
        'register ImmoGuinee', 'create real estate account',
        'free listing account', 'join ImmoGuinee',
      ],
    },
  },
  terms: {
    fr: {
      title: 'Conditions Generales d\'Utilisation - ImmoGuinee',
      description: 'Consultez les conditions generales d\'utilisation de la plateforme ImmoGuinee. Regles de publication, responsabilites, droits des utilisateurs.',
    },
    en: {
      title: 'Terms of Use - ImmoGuinee',
      description: 'View the terms of use for the ImmoGuinee platform. Publishing rules, responsibilities, user rights.',
    },
  },
  privacy: {
    fr: {
      title: 'Politique de Confidentialite - ImmoGuinee',
      description: 'Decouvrez comment ImmoGuinee protege vos donnees personnelles. Collecte, utilisation et securite de vos informations sur notre plateforme immobiliere.',
    },
    en: {
      title: 'Privacy Policy - ImmoGuinee',
      description: 'Learn how ImmoGuinee protects your personal data. Collection, use and security of your information on our real estate platform.',
    },
  },
};

// Generate metadata for a specific page
export function generatePageMetadata(pageKey: string, locale: 'fr' | 'en' = 'fr'): Metadata {
  const pageConfig = PAGE_SEO[pageKey];
  if (!pageConfig) {
    return {
      title: DEFAULT_SEO.defaultTitle,
    };
  }
  return pageConfig[locale] || pageConfig.fr;
}

// Generate dynamic listing metadata
export function generateListingMetadata(listing: {
  id: string;
  titre: string;
  description?: string;
  prix?: number;
  type_bien: string;
  type_transaction: string;
  commune: string;
  quartier: string;
  superficie?: number;
  nombre_chambres?: number;
  main_photo_url?: string;
}, locale: 'fr' | 'en' = 'fr'): Metadata {
  const url = `${BASE_URL}/annonces/${listing.id}`;
  const typeBien = listing.type_bien?.toLowerCase() || 'bien';
  const transaction = listing.type_transaction === 'LOCATION' ? (locale === 'fr' ? 'a louer' : 'for rent') :
                      listing.type_transaction === 'VENTE' ? (locale === 'fr' ? 'a vendre' : 'for sale') :
                      (locale === 'fr' ? 'courte duree' : 'short-term');
  const location = `${listing.quartier}, ${listing.commune}`;
  const priceText = listing.prix ? `${new Intl.NumberFormat('fr-GN').format(listing.prix)} GNF` : '';

  const title = locale === 'fr'
    ? `${listing.titre || typeBien} ${transaction} ${location} - ${priceText} | ImmoGuinee`
    : `${listing.titre || typeBien} ${transaction} ${location} - ${priceText} | ImmoGuinee`;

  const description = listing.description?.substring(0, 155) ||
    (locale === 'fr'
      ? `${typeBien} ${transaction} a ${location}. ${listing.superficie ? listing.superficie + 'm2' : ''} ${listing.nombre_chambres ? listing.nombre_chambres + ' chambres' : ''}. ${priceText}. Contactez sur ImmoGuinee.`
      : `${typeBien} ${transaction} in ${location}. ${listing.superficie ? listing.superficie + 'm2' : ''} ${listing.nombre_chambres ? listing.nombre_chambres + ' bedrooms' : ''}. ${priceText}. Contact on ImmoGuinee.`);

  return {
    title,
    description,
    keywords: [typeBien, transaction, listing.quartier, listing.commune, 'immobilier Guinee', 'Conakry'],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'fr' ? 'fr_GN' : 'en_US',
      url,
      siteName: 'ImmoGuinee',
      images: listing.main_photo_url ? [{ url: listing.main_photo_url, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: listing.main_photo_url ? [listing.main_photo_url] : [],
    },
    robots: { index: true, follow: true },
  };
}

// Generate search page metadata based on filters
export function generateSearchMetadata(params: {
  type_transaction?: string;
  type_bien?: string;
  commune?: string;
  quartier?: string;
}, locale: 'fr' | 'en' = 'fr'): Metadata {
  const { type_transaction, type_bien, commune, quartier } = params;

  let titleParts: string[] = [];
  let descParts: string[] = [];

  // Build title based on filters
  if (type_bien) {
    const typeLabel = locale === 'fr' ? {
      'APPARTEMENT': 'Appartement',
      'MAISON': 'Maison',
      'VILLA': 'Villa',
      'STUDIO': 'Studio',
      'TERRAIN': 'Terrain',
      'BUREAU': 'Bureau',
      'MAGASIN': 'Magasin',
    }[type_bien] || type_bien : {
      'APPARTEMENT': 'Apartment',
      'MAISON': 'House',
      'VILLA': 'Villa',
      'STUDIO': 'Studio',
      'TERRAIN': 'Land',
      'BUREAU': 'Office',
      'MAGASIN': 'Shop',
    }[type_bien] || type_bien;
    titleParts.push(typeLabel);
  }

  if (type_transaction) {
    const transLabel = locale === 'fr' ? {
      'LOCATION': 'a Louer',
      'VENTE': 'a Vendre',
      'LOCATION_COURTE': 'Location Courte Duree',
    }[type_transaction] || '' : {
      'LOCATION': 'for Rent',
      'VENTE': 'for Sale',
      'LOCATION_COURTE': 'Short-Term Rental',
    }[type_transaction] || '';
    titleParts.push(transLabel);
  }

  if (quartier) {
    titleParts.push(locale === 'fr' ? `a ${quartier}` : `in ${quartier}`);
  } else if (commune) {
    titleParts.push(locale === 'fr' ? `a ${commune}` : `in ${commune}`);
  } else {
    titleParts.push(locale === 'fr' ? 'Conakry, Guinee' : 'Conakry, Guinea');
  }

  const title = titleParts.length > 0
    ? `${titleParts.join(' ')} | ImmoGuinee`
    : (locale === 'fr' ? 'Recherche Immobilier Conakry | ImmoGuinee' : 'Real Estate Search Conakry | ImmoGuinee');

  const description = locale === 'fr'
    ? `Trouvez ${titleParts.slice(0, -1).join(' ').toLowerCase() || 'des biens immobiliers'} ${quartier ? 'a ' + quartier : commune ? 'a ' + commune : 'a Conakry'}. Annonces verifiees, photos HD, contact direct proprietaire.`
    : `Find ${titleParts.slice(0, -1).join(' ').toLowerCase() || 'real estate'} ${quartier ? 'in ' + quartier : commune ? 'in ' + commune : 'in Conakry'}. Verified listings, HD photos, direct owner contact.`;

  const urlParams = new URLSearchParams();
  if (type_transaction) urlParams.set('type_transaction', type_transaction);
  if (type_bien) urlParams.set('type_bien', type_bien);
  if (commune) urlParams.set('commune', commune);
  if (quartier) urlParams.set('quartier', quartier);

  const url = `${BASE_URL}/recherche${urlParams.toString() ? '?' + urlParams.toString() : ''}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'fr' ? 'fr_GN' : 'en_US',
      url,
      siteName: 'ImmoGuinee',
    },
    robots: { index: true, follow: true },
  };
}

// Robot directives for different page types
export const ROBOTS_CONFIG = {
  public: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' as const, 'max-snippet': -1 } },
  auth: { index: false, follow: false },
  admin: { index: false, follow: false },
  noindex: { index: false, follow: true },
};
