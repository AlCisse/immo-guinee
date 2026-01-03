import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Publier une Annonce Immobiliere Gratuite | ImmoGuinee',
  description: 'Publiez gratuitement votre annonce immobiliere en Guinee. Location ou vente de maison, appartement, villa, terrain a Conakry. Touchez des milliers d\'acheteurs et locataires potentiels.',
  keywords: [
    'publier annonce immobiliere',
    'annonce gratuite Guinee',
    'vendre maison Conakry',
    'louer appartement Guinee',
    'depot annonce immobilier',
    'mettre en vente terrain',
    'publier location villa',
    'annonce immobiliere gratuite',
    'poster annonce Conakry',
  ],
  alternates: {
    canonical: 'https://immoguinee.com/publier',
  },
  openGraph: {
    title: 'Publier une Annonce Gratuite | ImmoGuinee',
    description: 'Deposez votre annonce immobiliere gratuitement et touchez des milliers de clients en Guinee.',
    type: 'website',
    locale: 'fr_GN',
    url: 'https://immoguinee.com/publier',
    siteName: 'ImmoGuinee',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PublierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
