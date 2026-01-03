import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contactez ImmoGuinee - Support Immobilier Conakry, Guinee',
  description: 'Contactez l\'equipe ImmoGuinee pour toute question sur vos annonces, location ou vente immobiliere en Guinee. Support par WhatsApp, email, telephone a Conakry.',
  keywords: [
    'contact ImmoGuinee',
    'support immobilier Guinee',
    'aide annonces',
    'agence immobiliere Conakry contact',
    'service client immobilier',
    'WhatsApp ImmoGuinee',
    'email immobilier Conakry',
    'telephone agence Guinee',
  ],
  alternates: {
    canonical: 'https://immoguinee.com/contact',
  },
  openGraph: {
    title: 'Contactez-nous | ImmoGuinee',
    description: 'Besoin d\'aide ? Notre equipe est disponible par WhatsApp, email et telephone.',
    type: 'website',
    locale: 'fr_GN',
    url: 'https://immoguinee.com/contact',
    siteName: 'ImmoGuinee',
  },
  twitter: {
    card: 'summary',
    title: 'Contact ImmoGuinee',
    description: 'Support immobilier en Guinee - WhatsApp, Email, Telephone',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
