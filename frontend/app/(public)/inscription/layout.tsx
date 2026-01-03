import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inscription Gratuite - Creez votre Compte | ImmoGuinee',
  description: 'Inscrivez-vous gratuitement sur ImmoGuinee, la plateforme immobiliere N1 en Guinee. Publiez des annonces, sauvegardez vos favoris et contactez les proprietaires a Conakry.',
  keywords: [
    'inscription ImmoGuinee',
    'creer compte immobilier Guinee',
    'inscription gratuite Conakry',
    'compte annonces immobilieres',
    'rejoindre ImmoGuinee',
  ],
  alternates: {
    canonical: 'https://immoguinee.com/inscription',
  },
  openGraph: {
    title: 'Inscription Gratuite | ImmoGuinee',
    description: 'Rejoignez la communaute immobiliere N1 en Guinee. Inscription gratuite et rapide.',
    type: 'website',
    locale: 'fr_GN',
    url: 'https://immoguinee.com/inscription',
    siteName: 'ImmoGuinee',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function InscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
