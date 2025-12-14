'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import SearchFilters, { SearchFiltersState } from '@/components/listings/SearchFilters';
import ListingCard from '@/components/listings/ListingCard';
import { useListings, SortOption } from '@/lib/hooks/useListings';

export default function AnnoncesList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Mobile filters state
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Initialize filters from URL params
  const [filters, setFilters] = useState<SearchFiltersState>(() => {
    const initialFilters: SearchFiltersState = {};

    if (searchParams.get('operationType'))
      initialFilters.operationType = searchParams.get('operationType') as 'LOCATION' | 'VENTE';
    if (searchParams.get('typeBien')) initialFilters.typeBien = searchParams.get('typeBien') as any;
    if (searchParams.get('commune')) initialFilters.commune = searchParams.get('commune')!;
    if (searchParams.get('quartier')) initialFilters.quartier = searchParams.get('quartier')!;
    if (searchParams.get('prixMin'))
      initialFilters.prixMin = parseInt(searchParams.get('prixMin')!, 10);
    if (searchParams.get('prixMax'))
      initialFilters.prixMax = parseInt(searchParams.get('prixMax')!, 10);
    if (searchParams.get('superficieMin'))
      initialFilters.superficieMin = parseInt(searchParams.get('superficieMin')!, 10);
    if (searchParams.get('superficieMax'))
      initialFilters.superficieMax = parseInt(searchParams.get('superficieMax')!, 10);
    if (searchParams.get('nombreChambresMin'))
      initialFilters.nombreChambresMin = parseInt(searchParams.get('nombreChambresMin')!, 10);
    if (searchParams.get('nombreChambresMax'))
      initialFilters.nombreChambresMax = parseInt(searchParams.get('nombreChambresMax')!, 10);
    if (searchParams.get('cautionMax'))
      initialFilters.cautionMax = parseInt(searchParams.get('cautionMax')!, 10);

    return initialFilters;
  });

  // Pagination and sorting
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams.get('page');
    return page ? parseInt(page, 10) : 1;
  });

  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const sort = searchParams.get('sort');
    return (sort as SortOption) || 'date_desc';
  });

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');

  // Fetch listings with React Query
  const { data, isLoading, isError, error } = useListings({
    ...filters,
    page: currentPage,
    perPage: 20, // FR-019: 20 annonces par page
    sort: sortBy,
    q: searchQuery || undefined,
  });

  // Update URL when filters/pagination/sort changes
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();

    // Add filters to URL
    if (filters.operationType) params.set('operationType', filters.operationType);
    if (filters.typeBien) params.set('typeBien', filters.typeBien);
    if (filters.commune) params.set('commune', filters.commune);
    if (filters.quartier) params.set('quartier', filters.quartier);
    if (filters.prixMin !== undefined) params.set('prixMin', filters.prixMin.toString());
    if (filters.prixMax !== undefined) params.set('prixMax', filters.prixMax.toString());
    if (filters.superficieMin !== undefined)
      params.set('superficieMin', filters.superficieMin.toString());
    if (filters.superficieMax !== undefined)
      params.set('superficieMax', filters.superficieMax.toString());
    if (filters.nombreChambresMin !== undefined)
      params.set('nombreChambresMin', filters.nombreChambresMin.toString());
    if (filters.nombreChambresMax !== undefined)
      params.set('nombreChambresMax', filters.nombreChambresMax.toString());
    if (filters.cautionMax !== undefined) params.set('cautionMax', filters.cautionMax.toString());

    // Add pagination and sort
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (sortBy !== 'date_desc') params.set('sort', sortBy);
    if (searchQuery) params.set('q', searchQuery);

    const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newURL, { scroll: false });
  }, [filters, currentPage, sortBy, searchQuery, pathname, router]);

  const handleFiltersChange = (newFilters: SearchFiltersState) => {
    setFilters(newFilters);
  };

  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page on new search
    setShowMobileFilters(false); // Close mobile filters
    updateURL();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1); // Reset to first page on sort change
  };

  // Update URL when dependencies change
  useEffect(() => {
    updateURL();
  }, [updateURL]);

  // Pagination component
  const Pagination = () => {
    if (!data?.meta) return null;

    const { currentPage: page, lastPage, total } = data.meta;
    const pages: number[] = [];

    // Simple pagination logic: show current page, prev, next, first, last
    const showPages = 5;
    let startPage = Math.max(1, page - Math.floor(showPages / 2));
    const endPage = Math.min(lastPage, startPage + showPages - 1);

    if (endPage - startPage + 1 < showPages) {
      startPage = Math.max(1, endPage - showPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (lastPage <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-2 mt-8">
        {/* Previous button */}
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
          aria-label="Page précédente"
        >
          ← Précédent
        </button>

        {/* First page */}
        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              1
            </button>
            {startPage > 2 && <span className="text-gray-500">...</span>}
          </>
        )}

        {/* Page numbers */}
        {pages.map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => handlePageChange(pageNum)}
            className={`px-4 py-2 rounded-lg border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 ${
              pageNum === page
                ? 'bg-green-600 text-white border-green-600'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            aria-label={`Page ${pageNum}`}
            aria-current={pageNum === page ? 'page' : undefined}
          >
            {pageNum}
          </button>
        ))}

        {/* Last page */}
        {endPage < lastPage && (
          <>
            {endPage < lastPage - 1 && <span className="text-gray-500">...</span>}
            <button
              onClick={() => handlePageChange(lastPage)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {lastPage}
            </button>
          </>
        )}

        {/* Next button */}
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page === lastPage}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
          aria-label="Page suivante"
        >
          Suivant →
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with search and sort */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Annonces immobilières</h1>

          {/* Full-text search bar (FR-020) */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                placeholder="Rechercher dans les titres et descriptions..."
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                aria-label="Recherche en texte libre"
              />
              <svg
                className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Rechercher
            </button>
          </div>

          {/* Mobile filter toggle button */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setShowMobileFilters(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filtres
            </button>
          </div>

          {/* Results count and sort (FR-019) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {data?.meta && (
              <div className="text-gray-700 font-medium">
                <span className="text-green-600">{data.meta.total}</span> annonce
                {data.meta.total > 1 ? 's' : ''} trouvée{data.meta.total > 1 ? 's' : ''}
              </div>
            )}

            {/* Sort options (FR-018) */}
            <div className="flex items-center gap-3">
              <label htmlFor="sort-select" className="text-sm text-gray-700 font-medium">
                Trier par:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white"
              >
                <option value="date_desc">Plus récent</option>
                <option value="date_asc">Plus ancien</option>
                <option value="prix_asc">Prix croissant</option>
                <option value="prix_desc">Prix décroissant</option>
                <option value="popularite">Popularité</option>
                <option value="certification">Certification</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main content: Filters + Results */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Desktop filters sidebar */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-8">
              <SearchFilters
                initialFilters={filters}
                onFiltersChange={handleFiltersChange}
                onSearch={handleSearch}
              />
            </div>
          </aside>

          {/* Mobile filters overlay */}
          {showMobileFilters && (
            <SearchFilters
              initialFilters={filters}
              onFiltersChange={handleFiltersChange}
              onSearch={handleSearch}
              showMobileFilters={showMobileFilters}
              onCloseMobileFilters={() => setShowMobileFilters(false)}
            />
          )}

          {/* Listings grid */}
          <main className="lg:col-span-9">
            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-600">Chargement des annonces...</p>
                </div>
              </div>
            )}

            {/* Error state */}
            {isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <svg
                  className="w-12 h-12 text-red-600 mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-red-900 mb-2">Erreur de chargement</h3>
                <p className="text-red-700 mb-4">
                  {error instanceof Error ? error.message : 'Une erreur est survenue'}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && data?.data.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune annonce trouvée</h3>
                <p className="text-gray-600 mb-6">
                  Essayez de modifier vos critères de recherche ou de supprimer certains filtres.
                </p>
                <button
                  onClick={() => {
                    setFilters({});
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Réinitialiser la recherche
                </button>
              </div>
            )}

            {/* Listings grid (FR-021) */}
            {!isLoading && !isError && data && data.data.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {data.data.map((listing, index) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      priority={index < 6} // Priority loading for first 6 images
                    />
                  ))}
                </div>

                {/* Pagination (FR-019) */}
                <Pagination />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
