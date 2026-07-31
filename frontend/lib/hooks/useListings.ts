import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { SearchFiltersState } from '@/components/listings/SearchFilters';
import type { Listing } from '@/components/listings/ListingCard';

export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
  from: number;
  to: number;
}

export interface ListingsSearchResponse {
  data: Listing[];
  meta: PaginationMeta;
}

export type SortOption =
  | 'date_desc'
  | 'date_asc'
  | 'prix_asc'
  | 'prix_desc'
  | 'popularite'
  | 'certification'
  | 'distance';

export interface SearchParams extends SearchFiltersState {
  page?: number;
  perPage?: number;
  sort?: SortOption;
  q?: string; // Full-text search query
  latitude?: number; // For distance sorting
  longitude?: number; // For distance sorting
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Request timeout (ms). On 2G/3G a stalled request would otherwise hang the UI
// indefinitely (fetch has no built-in timeout). 20s is long enough for a slow
// search response but short enough that the user gets feedback (retry) instead
// of an infinite spinner.
const SEARCH_TIMEOUT_MS = 20_000;
const MUTATION_TIMEOUT_MS = 30_000;

/**
 * Fetch with a request timeout + React Query abort propagation.
 *
 * Combines the upstream `AbortSignal` (provided by React Query's `queryFn` so it
 * can cancel in-flight requests when the user changes filters / unmounts) with a
 * bounded timeout. The fetch aborts when EITHER fires:
 *   - the upstream signal aborts (RQ cancellation) → throws an AbortError that RQ
 *     treats as a cancellation (no retry);
 *   - the timeout elapses (stalled connection) → throws an AbortError that RQ
 *     retries (network-style failure), so a flaky 2G request gets a second chance.
 *
 * The timeout timer is always cleared when the fetch settles (no lingering timer).
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  upstream: AbortSignal | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (upstream) {
    if (upstream.aborted) {
      clearTimeout(timer);
      throw new DOMException('Aborted', 'AbortError');
    }
    upstream.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch listings with search filters and pagination
 */
async function fetchListings(params: SearchParams, signal?: AbortSignal): Promise<ListingsSearchResponse> {
  const queryParams = new URLSearchParams();

  // Pagination
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.perPage) queryParams.append('per_page', params.perPage.toString());

  // Sort
  if (params.sort) queryParams.append('sort', params.sort);

  // Full-text search
  if (params.q) queryParams.append('q', params.q);

  // Filters
  if (params.operationType) queryParams.append('operationType', params.operationType);
  if (params.typeBien) queryParams.append('typeBien', params.typeBien);
  if (params.commune) queryParams.append('commune', params.commune);
  if (params.quartier) queryParams.append('quartier', params.quartier);
  if (params.prixMin !== undefined) queryParams.append('prixMin', params.prixMin.toString());
  if (params.prixMax !== undefined) queryParams.append('prixMax', params.prixMax.toString());
  if (params.superficieMin !== undefined)
    queryParams.append('superficieMin', params.superficieMin.toString());
  if (params.superficieMax !== undefined)
    queryParams.append('superficieMax', params.superficieMax.toString());
  if (params.nombreChambresMin !== undefined)
    queryParams.append('nombreChambresMin', params.nombreChambresMin.toString());
  if (params.nombreChambresMax !== undefined)
    queryParams.append('nombreChambresMax', params.nombreChambresMax.toString());
  if (params.cautionMax !== undefined) queryParams.append('cautionMax', params.cautionMax.toString());

  // Geolocation for distance sorting
  if (params.latitude !== undefined) queryParams.append('latitude', params.latitude.toString());
  if (params.longitude !== undefined) queryParams.append('longitude', params.longitude.toString());

  const url = `${API_BASE_URL}/listings/search?${queryParams.toString()}`;

  const response = await fetchWithTimeout(
    url,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
    },
    signal,
    SEARCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch listings: ${response.statusText}`);
  }

  const json = await response.json();

  // Transform API response to expected format
  // API returns: { success, data: { listings, pagination: { current_page, per_page, total, last_page } } }
  // We need: { data: [...], meta: { currentPage, perPage, total, lastPage, from, to } }
  const apiData = json.data || json;
  const listings = apiData.listings || apiData.data || [];
  const pagination = apiData.pagination || {};

  return {
    data: listings,
    meta: {
      currentPage: pagination.current_page || 1,
      perPage: pagination.per_page || 20,
      total: pagination.total || listings.length,
      lastPage: pagination.last_page || 1,
      from: ((pagination.current_page || 1) - 1) * (pagination.per_page || 20) + 1,
      to: Math.min((pagination.current_page || 1) * (pagination.per_page || 20), pagination.total || listings.length),
    },
  };
}

/**
 * Fetch a single listing by ID
 */
async function fetchListingById(id: string, signal?: AbortSignal): Promise<Listing> {
  const url = `${API_BASE_URL}/listings/${id}`;

  const response = await fetchWithTimeout(
    url,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
    },
    signal,
    SEARCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch listing: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Hook for searching/filtering listings with pagination
 */
export function useListings(params: SearchParams = {}) {
  const defaultParams: SearchParams = {
    page: 1,
    perPage: 20,
    sort: 'date_desc',
    ...params,
  };

  return useQuery({
    queryKey: ['listings', defaultParams],
    queryFn: ({ signal }) => fetchListings(defaultParams, signal),
    staleTime: 1000 * 60 * 2, // 2 minutes - FR-094 performance
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    // Stale-while-revalidate across pages: keep the previous page visible while
    // the next one loads (no blank spinner on pagination, smooth on slow networks).
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook for fetching a single listing by ID
 */
export function useListing(id: string) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: ({ signal }) => fetchListingById(id, signal),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
}

/**
 * Hook for fetching latest listings (homepage)
 */
export function useLatestListings(limit: number = 20) {
  return useQuery({
    queryKey: ['listings', 'latest', limit],
    queryFn: ({ signal }) =>
      fetchListings(
        {
          perPage: limit,
          sort: 'date_desc',
        },
        signal,
      ),
    staleTime: 1000 * 60 * 1, // 1 minute for homepage freshness
    gcTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for creating a new listing (authenticated)
 *
 * Auth is carried by the HttpOnly `access_token` cookie (`credentials: 'include'`);
 * no Bearer token is read from localStorage — that legacy key is always empty
 * since the cookie migration, so the previous `Authorization: Bearer null` header
 * was dead and confusing.
 */
export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/listings`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
          },
          body: formData, // Send as FormData for file uploads
          credentials: 'include',
        },
        undefined,
        MUTATION_TIMEOUT_MS,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create listing');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate listings queries to refetch
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

/**
 * Hook for incrementing listing views (analytics)
 */
export function useIncrementListingView() {
  return useMutation({
    mutationFn: async (listingId: string) => {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/listings/${listingId}/view`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          credentials: 'include',
        },
        undefined,
        SEARCH_TIMEOUT_MS,
      );

      if (!response.ok) {
        throw new Error('Failed to increment view count');
      }

      return response.json();
    },
  });
}