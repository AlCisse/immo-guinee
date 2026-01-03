import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Centre d\'Aide ImmoGuinee - FAQ Immobilier Conakry, Guinee',
  description: 'Trouvez des reponses a toutes vos questions sur ImmoGuinee. Comment publier une annonce, eviter les arnaques, contacter un proprietaire. Guide complet immobilier Guinee.',
  keywords: [
    'aide ImmoGuinee',
    'FAQ immobilier Guinee',
    'comment publier annonce',
    'eviter arnaques immobilier',
    'guide location Conakry',
    'tutoriel annonce immobiliere',
    'centre aide immobilier',
    'questions frequentes immobilier',
    'support ImmoGuinee',
  ],
  alternates: {
    canonical: 'https://immoguinee.com/aide',
  },
  openGraph: {
    title: 'Centre d\'Aide | ImmoGuinee',
    description: 'FAQ et guide complet pour utiliser ImmoGuinee. Publiez des annonces, trouvez un logement en toute securite.',
    type: 'website',
    locale: 'fr_GN',
    url: 'https://immoguinee.com/aide',
    siteName: 'ImmoGuinee',
  },
  twitter: {
    card: 'summary',
    title: 'Centre d\'Aide ImmoGuinee',
    description: 'FAQ et tutoriels pour l\'immobilier en Guinee',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
