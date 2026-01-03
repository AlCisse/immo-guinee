import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mon Profil | ImmoGuinee',
  description: 'Gerez votre profil utilisateur ImmoGuinee. Modifiez vos informations et parametres de compte.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
