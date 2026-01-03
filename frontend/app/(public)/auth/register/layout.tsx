import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inscription Gratuite | ImmoGuinee - Rejoignez la Communaute',
  description: 'Creez votre compte gratuit ImmoGuinee. Publiez des annonces immobilieres, sauvegardez vos favoris, contactez les proprietaires. Rejoignez la communaute immobiliere en Guinee.',
  keywords: [
    'inscription ImmoGuinee',
    'creer compte immobilier',
    'compte gratuit annonces',
    'rejoindre ImmoGuinee',
    'inscription gratuite Guinee',
    'nouveau compte immobilier',
  ],
  alternates: {
    canonical: 'https://immoguinee.com/auth/register',
  },
  openGraph: {
    title: 'Inscription Gratuite | ImmoGuinee',
    description: 'Rejoignez la communaute immobiliere N1 en Guinee. Inscription gratuite et rapide.',
    type: 'website',
    locale: 'fr_GN',
    url: 'https://immoguinee.com/auth/register',
    siteName: 'ImmoGuinee',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
