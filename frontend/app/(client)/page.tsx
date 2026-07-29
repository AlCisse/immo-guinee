import { api } from '@/lib/api/client';
import HomeClient, { type Listing, type QuartierStat } from './HomeClient';

// P2 — la home est un Server Component : les données publiques (annonces
// premium, stats par commune) sont fetchées côté serveur puis passées en
// `initialData` au composant client (HomeClient) qui les seed dans React Query.
// Premier paint avec de vraies annonces (pas de spinner), et la page est ISR :
// `revalidate = 300` régénère le HTML en arrière-plan toutes les 5 min (cache CDN,
// first paint instantané, coût serveur réduit vs. l'ancien `force-dynamic` qui
// faisait du SSR per-request sur TOUTE l'app).
export const revalidate = 300;

// Récupère les annonces premium (même appel que le client, réutilise la
// normalisation mapRustListing/publicPhotoUrl de lib/api/client).
async function fetchPremiumListings(): Promise<Listing[]> {
  try {
    const res = await api.listings.list({ premium: true, limit: 8 });
    return res.data?.data?.listings ?? [];
  } catch {
    // Backend injoignable ou erreur → on rend la home avec un état vide ; le
    // client retentera un refetch (React Query) pour rester résilient.
    return [];
  }
}

// Récupère le top 5 des communes par nombre d'annonces.
async function fetchQuartierStats(): Promise<QuartierStat[]> {
  try {
    const res = await api.listings.list({ group_by: 'quartier', limit: 100 });
    const listings: Listing[] = res.data?.data?.listings ?? [];

    const counts: Record<string, number> = {};
    listings.forEach((listing) => {
      const quartier = listing.quartier || 'Autre';
      counts[quartier] = (counts[quartier] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  // Paralléliser les deux fetch serveur pour limiter la latence de régénération.
  const [premiumListings, quartiers] = await Promise.all([
    fetchPremiumListings(),
    fetchQuartierStats(),
  ]);

  return (
    <HomeClient
      initialPremiumListings={premiumListings}
      initialQuartiers={quartiers}
    />
  );
}