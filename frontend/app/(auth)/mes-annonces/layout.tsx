import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mes Annonces | ImmoGuinee',
  description: 'Gerez vos annonces immobilieres publiees sur ImmoGuinee. Modifiez, activez ou desactivez vos biens.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MesAnnoncesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
