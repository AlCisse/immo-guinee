// R4/R5 — squelette de chargement pour la recherche. Inclut un squelette de la
// sidebar de filtres (à gauche) et de la grille de résultats (à droite) pour
// refléter fidèlement la mise en page finale pendant le rendu.

export default function RechercheLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 h-8 w-56 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar de filtres */}
          <div className="lg:w-72 flex-shrink-0 space-y-4">
            <div className="h-40 bg-white dark:bg-dark-card rounded-2xl shadow-soft animate-pulse" />
            <div className="h-32 bg-white dark:bg-dark-card rounded-2xl shadow-soft animate-pulse" />
          </div>

          {/* Grille de résultats */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
              >
                <div className="h-40 bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-5 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}