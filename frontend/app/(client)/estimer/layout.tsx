import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Estimation Immobiliere Gratuite Conakry - Prix au m2 Guinee | ImmoGuinee',
  description: 'Estimez gratuitement la valeur de votre bien immobilier a Conakry. Prix au m2 par quartier (Kipe, Ratoma, Kaloum, Madina), estimation precise pour location et vente.',
  keywords: [
    'estimation immobiliere Conakry',
    'prix m2 Guinee',
    'evaluer maison Conakry',
    'estimation appartement Kipe',
    'prix immobilier Conakry',
    'valeur terrain Guinee',
    'estimation villa Ratoma',
    'prix location Kaloum',
    'estimation gratuite immobilier',
    'calculer valeur bien',
  ],
  alternates: {
    canonical: 'https://immoguinee.com/estimer',
  },
  openGraph: {
    title: 'Estimation Immobiliere Gratuite | ImmoGuinee',
    description: 'Estimez la valeur de votre bien en quelques clics. Prix au m2 par quartier a Conakry.',
    type: 'website',
    locale: 'fr_GN',
    url: 'https://immoguinee.com/estimer',
    siteName: 'ImmoGuinee',
  },
  twitter: {
    card: 'summary',
    title: 'Estimation Immobiliere Conakry | ImmoGuinee',
    description: 'Estimez gratuitement votre bien immobilier en Guinee',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function EstimerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
