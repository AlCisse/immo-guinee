import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

// Redirect old /annonces/[id] URLs to /bien/[id]
export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  redirect(`/bien/${id}`);
}
