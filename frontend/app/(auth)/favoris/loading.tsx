// R4/R5 — squelette de chargement pour la page favoris. Cartes animate-pulse en
// attendant la résolution de la requête favorites (React Query).

export default function FavorisLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 h-8 w-40 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
            >
              <div className="h-48 bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}