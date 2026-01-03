import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { Providers } from './providers';
import { OrganizationStructuredData, WebSiteStructuredData, LocalBusinessStructuredData } from '@/components/seo/StructuredData';

// Force dynamic rendering for all pages to avoid SSG issues with client hooks
export const dynamic = 'force-dynamic';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F97316' },
    { media: '(prefers-color-scheme: dark)', color: '#EA580C' },
  ],
};

export const metadata: Metadata = {
  title: {
    default: 'ImmoGuinée - Location & Vente Immobilier à Conakry, Guinée',
    template: '%s | ImmoGuinée',
  },
  description:
    'Plateforme immobilière N°1 en Guinée. Location appartement meublé, villa, maison à Conakry. Vente terrain, parcelle avec titre foncier. Annonces gratuites Kipé, Ratoma, Kaloum, Dixinn, Matam, Matoto.',
  keywords: [
    // Termes principaux
    'immobilier Guinée',
    'immobilier Conakry',
    'annonces immobilières Guinée',
    'agence immobilière Conakry',
    // Location
    'location appartement Conakry',
    'appartement à louer Conakry',
    'location maison Guinée',
    'villa à louer Conakry',
    'studio meublé Conakry',
    'location meublée Conakry',
    'chambre salon à louer',
    'appartement meublé Guinée',
    // Vente
    'maison à vendre Conakry',
    'terrain à vendre Guinée',
    'parcelle à vendre Conakry',
    'achat immobilier Guinée',
    'investissement immobilier Conakry',
    'terrain avec titre foncier',
    // Courte durée
    'location courte durée Conakry',
    'airbnb Conakry Guinée',
    'logement expatrié Guinée',
    'court séjour Conakry',
    'hébergement Conakry',
    // Quartiers Conakry
    'immobilier Kipé',
    'appartement Ratoma',
    'location Kaloum',
    'villa Dixinn',
    'maison Matam',
    'terrain Matoto',
    'logement Nongo',
    'location Taouyah',
    'appartement Lambanyi',
    // Équipements
    'appartement climatisé',
    'groupe électrogène',
    'villa avec piscine',
    'logement sécurisé',
    // Types
    'villa standing',
    'duplex Conakry',
    'bureau à louer',
    'local commercial',
  ],
  authors: [{ name: 'ImmoGuinée' }],
  creator: 'ImmoGuinée',
  publisher: 'ImmoGuinée',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '256x256', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'fr_GN',
    url: 'https://immoguinee.com',
    siteName: 'ImmoGuinée',
    title: 'ImmoGuinée - Location & Vente Immobilier à Conakry, Guinée',
    description:
      'Plateforme immobilière N°1 en Guinée. Location appartement meublé, villa, maison à Conakry. Vente terrain, parcelle. Annonces gratuites à Kipé, Ratoma, Kaloum.',
    images: [
      {
        url: 'https://immoguinee.com/images/banner-hero.jpg',
        width: 1200,
        height: 630,
        alt: 'ImmoGuinée - Location et Vente Immobilier Conakry Guinée',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ImmoGuinée - Immobilier Conakry Guinée',
    description: 'Location appartement, villa, maison à Conakry. Vente terrain avec titre foncier. Annonces gratuites en Guinée.',
    images: ['https://immoguinee.com/images/banner-hero.jpg'],
  },
  alternates: {
    canonical: 'https://immoguinee.com',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <OrganizationStructuredData />
        <WebSiteStructuredData />
        <LocalBusinessStructuredData />
      </head>
      <body
        className={`${inter.variable} ${poppins.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
