import { Metadata } from 'next';
import AnnoncesList from './AnnoncesList';

export const metadata: Metadata = {
  title: 'Recherche d\'annonces immobilières | ImmoGuinée',
  description:
    'Trouvez votre bien immobilier idéal en Guinée : maisons, appartements, villas, terrains à louer ou à vendre à Conakry et partout en Guinée.',
  keywords: [
    'immobilier Guinée',
    'location appartement Conakry',
    'vente maison Guinée',
    'location villa',
    'annonces immobilières Guinée',
    'Kaloum',
    'Dixinn',
    'Matam',
    'Ratoma',
    'Matoto',
  ],
  alternates: {
    canonical: 'https://immoguinee.com/annonces',
  },
  openGraph: {
    title: 'Recherche d\'annonces immobilières | ImmoGuinée',
    description:
      'Découvrez des milliers d\'annonces immobilières en Guinée. Trouvez votre logement idéal facilement.',
    type: 'website',
    locale: 'fr_GN',
    url: 'https://immoguinee.com/annonces',
    siteName: 'ImmoGuinée',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recherche d\'annonces immobilières | ImmoGuinée',
    description:
      'Découvrez des milliers d\'annonces immobilières en Guinée. Filtres avancés, photos de qualité.',
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

export default function AnnoncesPage() {
  return <AnnoncesList />;
}
