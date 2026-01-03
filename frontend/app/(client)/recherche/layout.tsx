import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recherche Immobilier Conakry - Appartements, Maisons, Terrains | ImmoGuinee',
  description: 'Recherchez parmi des milliers d\'annonces immobilieres en Guinee. Filtrez par quartier (Kipe, Ratoma, Kaloum, Madina), type de bien et prix. Location et vente a Conakry.',
  keywords: [
    'recherche immobilier Conakry',
    'annonces immobilieres Guinee',
    'appartement Kipe',
    'maison Ratoma',
    'terrain Matoto',
    'location Kaloum',
    'vente immobilier Dixinn',
    'villa Conakry',
    'studio Madina',
    'bureau Almamya',
    'location meublee Nongo',
    'terrain titre foncier',
  ],
  alternates: {
    canonical: 'https://immoguinee.com/recherche',
  },
  openGraph: {
    title: 'Recherche Immobilier Conakry | ImmoGuinee',
    description: 'Des milliers d\'annonces immobilieres a Conakry. Location, vente, courte duree. Filtres avances par quartier et prix.',
    type: 'website',
    locale: 'fr_GN',
    url: 'https://immoguinee.com/recherche',
    siteName: 'ImmoGuinee',
    images: [
      {
        url: 'https://immoguinee.com/images/banner-hero.jpg',
        width: 1200,
        height: 630,
        alt: 'Recherche immobilier Conakry Guinee',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recherche Immobilier Conakry | ImmoGuinee',
    description: 'Trouvez votre bien ideal en Guinee',
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

export default function RechercheLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
