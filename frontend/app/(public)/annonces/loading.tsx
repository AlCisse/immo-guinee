// R4/R5 — squelette de chargement pour la liste des annonces. Next.js affiche
// automatiquement ce fichier pendant que page.tsx se résout (streaming/Suspense),
// évitant l'écran blanc et donnant une idée de la mise en page finale (perceived
// performance). L'animate-pulse imite le chargement des cartes réelles.

export default function AnnoncesLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      <div className="container mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="mb-6">
          <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
          <div className="mt-3 h-4 w-72 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        </div>

        {/* Grille de squelettes de cartes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
            >
              <div className="h-48 bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                  <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}