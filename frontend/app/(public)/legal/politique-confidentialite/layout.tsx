import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de Confidentialite | ImmoGuinee',
  description: 'Decouvrez comment ImmoGuinee protege vos donnees personnelles. Collecte, utilisation et securite de vos informations sur notre plateforme immobiliere en Guinee.',
  alternates: {
    canonical: 'https://immoguinee.com/legal/politique-confidentialite',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
