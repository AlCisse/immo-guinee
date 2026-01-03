import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion | ImmoGuinee - Plateforme Immobiliere Guinee',
  description: 'Connectez-vous a votre compte ImmoGuinee pour gerer vos annonces immobilieres, favoris et messages. Acces securise a la plateforme immobiliere N1 en Guinee.',
  alternates: {
    canonical: 'https://immoguinee.com/auth/login',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
