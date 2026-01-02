import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { Providers } from './providers';
import { OrganizationStructuredData } from '@/components/seo/StructuredData';

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
  title: 'ImmoGuinée - Plateforme Immobilière en Guinée',
  description:
    'Trouvez votre logement idéal en Guinée. Location de maisons, appartements et terrains à Conakry et dans toute la Guinée.',
  keywords: [
    'immobilier',
    'guinée',
    'conakry',
    'location',
    'appartement',
    'maison',
    'terrain',
    'immog',
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
    title: 'ImmoGuinée - Plateforme Immobilière en Guinée',
    description:
      'Trouvez votre logement idéal en Guinée. Location de maisons, appartements et terrains.',
    images: [
      {
        url: 'https://immoguinee.com/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ImmoGuinée - Plateforme Immobilière en Guinée',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ImmoGuinée - Plateforme Immobilière en Guinée',
    description: 'Trouvez votre logement idéal en Guinée.',
    images: ['https://immoguinee.com/images/og-image.png'],
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
