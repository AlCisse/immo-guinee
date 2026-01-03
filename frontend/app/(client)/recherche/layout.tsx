import { Metadata } from 'next';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// SEO labels for transaction types
const transactionLabels: Record<string, { title: string; description: string }> = {
  LOCATION: {
    title: 'Location longue durée',
    description: 'Trouvez votre appartement ou maison à louer à Conakry. Location longue durée, meublé ou non meublé.',
  },
  LOCATION_COURTE: {
    title: 'Location courte durée',
    description: 'Appartements et villas meublés pour séjours courts à Conakry. Idéal pour voyageurs, expatriés et professionnels en mission.',
  },
  VENTE: {
    title: 'Biens à vendre',
    description: 'Achetez votre bien immobilier à Conakry. Appartements, maisons, villas et terrains à vendre en Guinée.',
  },
};

// SEO labels for property types
const propertyTypeLabels: Record<string, string> = {
  APPARTEMENT: 'Appartements',
  MAISON: 'Maisons',
  VILLA: 'Villas',
  STUDIO: 'Studios',
  BUREAU: 'Bureaux',
  MAGASIN: 'Magasins',
  TERRAIN: 'Terrains',
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const typeTransaction = params.type_transaction as string | undefined;
  const typeBien = params.type_bien as string | undefined;
  const commune = params.commune as string | undefined;
  const quartier = params.quartier as string | undefined;

  // Build dynamic title
  let titleParts: string[] = [];
  let descriptionParts: string[] = [];

  // Transaction type
  if (typeTransaction && transactionLabels[typeTransaction]) {
    titleParts.push(transactionLabels[typeTransaction].title);
    descriptionParts.push(transactionLabels[typeTransaction].description);
  }

  // Property type
  if (typeBien && propertyTypeLabels[typeBien]) {
    titleParts.unshift(propertyTypeLabels[typeBien]);
  }

  // Location
  if (quartier) {
    titleParts.push(`à ${quartier}`);
  } else if (commune) {
    titleParts.push(`à ${commune}`);
  } else {
    titleParts.push('à Conakry');
  }

  // Default if no specific filters
  if (titleParts.length === 1 && titleParts[0] === 'à Conakry') {
    titleParts = ['Recherche immobilière', 'à Conakry'];
  }

  const title = `${titleParts.join(' ')} | ImmoGuinée`;

  // Build description
  let description = descriptionParts[0] ||
    'Recherchez parmi des centaines d\'annonces immobilières à Conakry. Location, vente, courte durée. Appartements, maisons, villas meublées.';

  if (commune || quartier) {
    description = description.replace('à Conakry', `à ${quartier || commune}, Conakry`);
  }

  // Build canonical URL
  const urlParams = new URLSearchParams();
  if (typeTransaction) urlParams.set('type_transaction', typeTransaction);
  if (typeBien) urlParams.set('type_bien', typeBien);
  if (commune) urlParams.set('commune', commune);
  if (quartier) urlParams.set('quartier', quartier);

  const canonicalUrl = urlParams.toString()
    ? `https://immoguinee.com/recherche?${urlParams.toString()}`
    : 'https://immoguinee.com/recherche';

  // Keywords
  const keywords = [
    'immobilier Guinée',
    'Conakry',
    typeBien?.toLowerCase(),
    typeTransaction === 'LOCATION' ? 'location' : typeTransaction === 'LOCATION_COURTE' ? 'location courte durée' : 'vente',
    typeTransaction === 'LOCATION_COURTE' ? 'meublé' : undefined,
    typeTransaction === 'LOCATION_COURTE' ? 'court séjour' : undefined,
    commune,
    quartier,
  ].filter(Boolean);

  return {
    title,
    description,
    keywords: keywords as string[],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'fr_GN',
      url: canonicalUrl,
      siteName: 'ImmoGuinée',
      images: [
        {
          url: 'https://immoguinee.com/images/og-search.jpg',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
      },
    },
  };
}

export default function RechercheLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
