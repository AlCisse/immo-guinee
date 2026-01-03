import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Informations Legales | ImmoGuinee',
  description: 'Informations legales de ImmoGuinee : conditions d\'utilisation, politique de confidentialite, mentions legales de la plateforme immobiliere en Guinee.',
  alternates: {
    canonical: 'https://immoguinee.com/legal',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
