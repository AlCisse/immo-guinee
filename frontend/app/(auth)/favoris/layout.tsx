import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mes Favoris | ImmoGuinee',
  description: 'Retrouvez toutes vos annonces immobilieres favorites sur ImmoGuinee.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function FavorisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
