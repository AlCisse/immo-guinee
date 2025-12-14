import { Metadata } from 'next';
import ListingDetail from './ListingDetail';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // In production, fetch the listing data here for dynamic SEO
  // For now, use generic metadata with structured data
  const title = `Annonce immobilière ${id} | ImmoGuinée`;
  const description = 'Découvrez cette annonce immobilière en Guinée. Location et vente de biens immobiliers à Conakry.';
  const url = `https://immoguinee.com/annonces/${id}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'fr_GN',
      url,
      siteName: 'ImmoGuinée',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;

  return <ListingDetail listingId={id} />;
}
