import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tableau de Bord | ImmoGuinee',
  description: 'Gerez vos annonces immobilieres, messages et favoris depuis votre tableau de bord ImmoGuinee.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
