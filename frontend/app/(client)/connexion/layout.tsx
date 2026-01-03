import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion | ImmoGuinee - Plateforme Immobiliere Guinee',
  description: 'Connectez-vous a votre compte ImmoGuinee pour gerer vos annonces immobilieres, favoris et messages a Conakry.',
  alternates: {
    canonical: 'https://immoguinee.com/connexion',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function ConnexionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
