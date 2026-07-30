import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { CONAKRY_QUARTIERS } from '@/lib/data/communes';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// The Rust `quartier` enum is commune-level (KALOUM, DIXINN, RATOMA, MATAM, MATOTO).
// Map every neighbourhood → its commune so a neighbourhood filter resolves to the
// commune the listing is actually stored under. Communes map to themselves.
const NEIGHBORHOOD_TO_COMMUNE: Record<string, string> = Object.fromEntries(
  CONAKRY_QUARTIERS.map((q) => [q.name.toLowerCase(), q.commune]),
);

/// Rewrite the /recherche location + transaction params to the Rust query shape:
/// - type_transaction → type_operation (LOCATION_COURTE → LOCATION);
/// - commune + neighbourhood quartier → a de-duplicated commune-level `quartier` list.
function mapSearchParams(params: Record<string, any>): Record<string, any> {
  const p: Record<string, any> = { ...params };

  if (p.limit != null && p.per_page == null) {
    p.per_page = p.limit;
    delete p.limit;
  }

  if (p.type_transaction) {
    // LOCATION / LOCATION_COURTE / VENTE are all valid type_operation values.
    p.type_operation = String(p.type_transaction).toUpperCase();
    delete p.type_transaction;
  }

  const communes = new Set<string>();
  const addLocation = (val: unknown) => {
    if (typeof val !== 'string') return;
    for (const raw of val.split(',')) {
      const name = raw.trim();
      if (!name || name === 'Tous') continue;
      const commune = NEIGHBORHOOD_TO_COMMUNE[name.toLowerCase()] || name;
      communes.add(commune.toUpperCase());
    }
  };
  addLocation(p.quartier);
  addLocation(p.commune);
  delete p.commune;
  if (communes.size > 0) p.quartier = [...communes].join(',');
  else delete p.quartier;

  return p;
}

// --- JWT auth ---
// The access token is delivered by the backend as an `HttpOnly` cookie
// (`access_token`), invisible to JavaScript so an XSS payload cannot steal the
// session. We also keep an in-memory copy for the lifetime of the current tab so
// the `Authorization: Bearer` header still works within a session — but nothing
// is written to localStorage (which XSS *can* read). On reload the in-memory
// token is gone and the HttpOnly cookie alone re-authenticates the requests.
const LEGACY_TOKEN_KEY = 'auth_token';
let accessToken: string | null = null;

// One-time migration: purge any token persisted by an older build.
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) — nothing to purge */
  }
}

export function getAuthToken(): string | null {
  return accessToken;
}
export function setAuthToken(token: string | null) {
  accessToken = token && token.length > 0 ? token : null;
}

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  // Send the HttpOnly `access_token` cookie on every request (same-origin via
  // the Next.js `/api` proxy). This is now the primary auth channel; the Bearer
  // header (below) is a same-tab fallback.
  withCredentials: true,
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor - attach the JWT access token as a Bearer header.
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Silent token refresh (F6) ---
// On a 401 the access token has expired. Rather than logging the user out, we
// POST /auth/refresh once (the HttpOnly refresh cookie is sent automatically);
// on success the backend rotates + re-sets the cookies and the success
// interceptor captures the new in-memory access token, then we replay the
// original request. Concurrent 401s share a single in-flight refresh.
let refreshPromise: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    // _skipAuthRefresh guards against recursion if the refresh itself 401s.
    const cfg: AxiosRequestConfig & { _skipAuthRefresh?: boolean } = { _skipAuthRefresh: true };
    refreshPromise = apiClient
      .post('/auth/refresh', null, cfg)
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Unauthenticated flows where a 401 is a credential failure, not an expired
// session — never worth a refresh attempt (would just 401 again).
function isUnauthenticatedAuthRoute(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/otp') ||
    url.includes('/auth/refresh')
  );
}

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    // Capture the JWT access token from login / OTP-verify responses
    // (Rust envelope: { success, data: { access_token, refresh_token, ... } }).
    const token = response?.data?.data?.access_token;
    if (typeof token === 'string' && token.length > 0) {
      setAuthToken(token);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (AxiosRequestConfig & { _retry?: boolean; _skipAuthRefresh?: boolean })
      | undefined;
    const responseData = error.response?.data as { requires_2fa?: boolean; requires_2fa_setup?: boolean; message?: string } | undefined;

    // Handle 401 Unauthorized only. A 404 means the endpoint is not implemented
    // yet (many Rust endpoints are still missing) — it must NOT clear the session
    // or the user would be logged out by any unimplemented feature call.
    const status = error.response?.status;
    const url = originalRequest?.url || '';
    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest._skipAuthRefresh &&
      !isUnauthenticatedAuthRoute(url)
    ) {
      originalRequest._retry = true;

      // F6: try a silent refresh first (the access token likely just expired).
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // New cookie + in-memory token are set — replay the original request.
        return apiClient(originalRequest);
      }

      // Refresh failed → the session is really gone. Clear local auth state.
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        setAuthToken(null);

        // Redirect to login unless this was an auth endpoint (e.g. /auth/me on
        // initial load for an anonymous visitor — expected, handled by
        // AuthContext, no redirect/loop).
        if (!url.includes('/auth/')) {
          window.location.href = '/auth/login';
        }
      }
    }

    // Handle 403 with 2FA required (verification needed)
    if (error.response?.status === 403 && responseData?.requires_2fa) {
      if (typeof window !== 'undefined') {
        // Store the current path to redirect back after 2FA
        sessionStorage.setItem('2fa_redirect', window.location.pathname);
        window.location.href = '/auth/verify-2fa';
      }
      return Promise.reject(error);
    }

    // Handle 403 with 2FA setup required (not configured yet)
    if (error.response?.status === 403 && responseData?.requires_2fa_setup) {
      if (typeof window !== 'undefined') {
        // Store that we need setup, not verification
        sessionStorage.setItem('2fa_needs_setup', 'true');
        sessionStorage.setItem('2fa_redirect', window.location.pathname);
        window.location.href = '/auth/verify-2fa';
      }
      return Promise.reject(error);
    }

    // Handle 419 CSRF token mismatch
    if (error.response?.status === 419 && originalRequest && !originalRequest._retry) {
      // Retry the request once
      originalRequest._retry = true;
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

// --- Rust listing shape → UI (ListingCard/detail) shape -------------------
// The Rust API returns prix_gnf / type_operation / superficie_m2 and photos as
// objects ({thumbnail,medium,large}); UI components read prix / type_transaction /
// surface_m2 and photos as string[]. Map without dropping the original fields.
// Photo URLs are built by the backend from the internal S3 endpoint
// (http://minio:9000/…), which the browser can't reach. Rewrite to a same-origin
// path proxied to MinIO by Next (see next.config rewrites) — works for both the
// browser and the server-side Next Image optimizer. No-op in prod (real CDN URLs).
function publicPhotoUrl(url?: string): string | undefined {
  if (!url) return url;
  return url.replace(/https?:\/\/minio:9000\//, '/media/');
}

// Rust visit status (statut_visite) → the English vocabulary the visits UI uses.
const VISIT_STATUT_MAP: Record<string, string> = {
  EN_ATTENTE: 'PENDING',
  CONFIRMEE: 'CONFIRMED',
  COMPLETEE: 'COMPLETED',
  ANNULEE: 'CANCELLED',
};
function mapVisit(v: any): any {
  if (!v || typeof v !== 'object') return v;
  return { ...v, statut: VISIT_STATUT_MAP[v.statut] ?? v.statut };
}

// Rust listing status (statut_listing) → the vocabulary the UI + i18n keys use.
const STATUT_MAP: Record<string, string> = {
  DISPONIBLE: 'ACTIVE',
  EN_NEGOCIATION: 'EN_ATTENTE',
  LOUE_VENDU: 'ARCHIVEE',
  EXPIRE: 'EXPIREE',
  ARCHIVE: 'ARCHIVEE',
  SUSPENDU: 'SUSPENDUE',
};

function mapRustListing(l: any): any {
  if (!l || typeof l !== 'object') return l;
  const photos = Array.isArray(l.photos)
    ? l.photos
        .map((p: any) => publicPhotoUrl(typeof p === 'string' ? p : p?.medium || p?.large || p?.thumbnail))
        .filter(Boolean)
    : l.photos;
  const prix = l.prix ?? l.prix_gnf;
  const mainPhoto = l.main_photo_url ?? (Array.isArray(photos) && photos.length ? photos[0] : undefined);
  const isPremium = l.options_premium && typeof l.options_premium === 'object'
    ? Object.values(l.options_premium).some(Boolean)
    : (l.is_premium ?? false);
  return {
    ...l,
    prix,
    prix_gnf: l.prix_gnf ?? prix,
    // Different cards read loyer_mensuel (location) or prix_vente (sale); set both.
    loyer_mensuel: l.loyer_mensuel ?? prix,
    prix_vente: l.prix_vente ?? prix,
    type_transaction: l.type_transaction ?? l.type_operation,
    surface_m2: l.surface_m2 ?? l.superficie_m2,
    photos,
    main_photo_url: mainPhoto,
    photo_principale: l.photo_principale ?? mainPhoto,
    // The detail gallery reads listing_photos[{url,medium_url,large_url}].
    listing_photos: Array.isArray(photos)
      ? photos.map((u: string) => ({ url: u, medium_url: u, large_url: u }))
      : l.listing_photos,
    is_premium: isPremium,
    vues_count: l.vues_count ?? l.nombre_vues,
    created_at: l.created_at ?? l.date_publication,
    statut: (typeof l.statut === 'string' && STATUT_MAP[l.statut]) || l.statut,
  };
}

function normalizeListingsResponse(res: any): void {
  const listings = res?.data?.data?.listings;
  if (Array.isArray(listings)) {
    res.data.data.listings = listings.map(mapRustListing);
  }
}

// --- Create-listing form (FormData) → Rust CreateListingRequest (JSON) ----------
const TYPE_BIEN_MAP: Record<string, string> = {
  appartement: 'APPARTEMENT', villa: 'VILLA', maison: 'VILLA', studio: 'STUDIO',
  terrain: 'TERRAIN', commerce: 'COMMERCE', magasin: 'COMMERCE', boutique: 'COMMERCE',
  bureau: 'BUREAU', entrepot: 'ENTREPOT',
};
// Rust `quartier` is the commune level (5 Conakry communes + Dubréka/Coyah).
const QUARTIER_MAP: Record<string, string> = {
  kaloum: 'KALOUM', dixinn: 'DIXINN', ratoma: 'RATOMA', matam: 'MATAM', matoto: 'MATOTO',
};

function extractPhotoFiles(fd: FormData): File[] {
  const files: File[] = [];
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('photos[') && v instanceof File && v.size > 0) files.push(v);
  }
  return files;
}

function formDataToCreateBody(fd: FormData): Record<string, unknown> {
  const s = (k: string) => {
    const v = fd.get(k);
    return typeof v === 'string' ? v : undefined;
  };
  const num = (k: string) => {
    const v = s(k);
    if (v == null || v === '') return undefined;
    const n = Number(v.replace(/\D/g, ''));
    return Number.isFinite(n) ? n : undefined;
  };
  const equipements: string[] = [];
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('equipements[') && typeof v === 'string') equipements.push(v);
  }

  const op = (s('type_transaction') || '').toUpperCase();
  const body: Record<string, unknown> = {
    type_operation: op || 'LOCATION',
    type_bien: TYPE_BIEN_MAP[(s('type_propriete') || '').toLowerCase()] || 'APPARTEMENT',
    titre: s('titre'),
    description: s('description'),
    prix_gnf: num('prix') ?? 0,
    quartier: QUARTIER_MAP[(s('commune') || '').toLowerCase()] || 'KALOUM',
    adresse_complete: s('quartier') || undefined, // neighbourhood name → free-text address
    superficie_m2: num('surface_m2'),
    nombre_chambres: num('nombre_chambres'),
    caution_mois: num('caution_mois'),
    equipements: equipements.length > 0 ? equipements : undefined,
  };
  // Drop undefined so optional fields are omitted (backend treats them as absent).
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
  return body;
}

// Normalize a phone number to the E.164 shape the backend stores (+<countrycode>…).
// The phone input emits the dial code without a leading "+"; add it back.
function normalizePhone<T extends { telephone?: string }>(data: T): T {
  if (typeof data?.telephone !== 'string') return data;
  let t = data.telephone.replace(/[\s()-]/g, '');
  if (/^\d/.test(t)) t = `+${t}`;
  return { ...data, telephone: t };
}

// API Methods
export const api = {
  // Auth endpoints
  auth: {
    register: (data: { telephone: string; mot_de_passe: string; nom_complet: string; type_compte: string }) =>
      apiClient.post('/auth/register', normalizePhone(data)),

    verifyOtp: (data: { telephone: string; otp_code: string }) =>
      apiClient.post('/auth/otp/verify', { telephone: normalizePhone(data).telephone, code: data.otp_code }),

    resendOtp: (data: { telephone: string }) =>
      apiClient.post('/auth/otp/send', normalizePhone(data)),

    login: (data: { telephone: string; mot_de_passe: string }) =>
      apiClient.post('/auth/login', normalizePhone(data)),

    logout: () =>
      apiClient.post('/auth/logout', {}, { timeout: 3000 }), // Short timeout - we'll clean up locally anyway

    me: () =>
      apiClient.get('/auth/me'),

    updateProfile: (data: any) =>
      apiClient.patch('/auth/me', data),

    uploadProfilePhoto: (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      return apiClient.post('/auth/me/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },

    deleteProfilePhoto: () =>
      apiClient.delete('/auth/me/photo'),
  },

  // AI endpoints (rule-based text optimization - instant response)
  ai: {
    optimizeListing: (data: { titre: string; description: string; type_bien?: string; type_operation?: string; quartier?: string }) =>
      apiClient.post('/ai/optimize-listing', data, { timeout: 10000 }),
  },

  // Listings endpoints
  listings: {
    // The Rust API exposes GET /listings/search (there is no GET /listings list).
    // Normalize legacy params: limit -> per_page. Unknown params (sort_by/sort_order,
    // commune, type_transaction) are ignored by the backend's query extractor.
    // Response listings are normalized to the shape UI components expect.
    list: async (params?: Record<string, any>) => {
      const res = await apiClient.get('/listings/search', { params: mapSearchParams(params || {}) });
      normalizeListingsResponse(res);
      return res;
    },

    my: async (params?: Record<string, any>) => {
      const res = await apiClient.get('/listings/my', { params });
      normalizeListingsResponse(res);
      return res;
    },

    get: async (id: string) => {
      const res = await apiClient.get(`/listings/${id}`);
      if (res?.data?.data) res.data.data = mapRustListing(res.data.data);
      return res;
    },

    // The Rust API creates a listing from JSON (POST /listings) and takes photos on
    // a separate multipart endpoint (POST /listings/{id}/photos). The form still
    // builds one FormData, so split it here: map fields to the Rust shape, create,
    // then upload the photo files.
    create: async (data: FormData) => {
      const created = await apiClient.post('/listings', formDataToCreateBody(data));
      const id = created.data?.data?.id;
      const photos = extractPhotoFiles(data);
      if (id && photos.length > 0) {
        const pf = new FormData();
        photos.forEach((f) => pf.append('photo', f));
        try {
          await apiClient.post(`/listings/${id}/photos`, pf, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000,
          });
        } catch (e) {
          console.error('Photo upload failed (listing created):', e);
        }
      }
      return created;
    },

    update: (id: string, data: FormData) => {
      // Use dedicated POST endpoint for FormData with file uploads
      return apiClient.post(`/listings/${id}/update`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 minutes for photo uploads
      });
    },

    delete: (id: string) =>
      apiClient.delete(`/listings/${id}`),

    markAsRented: (id: string, rentedViaImmoguinee: boolean) =>
      apiClient.post(`/listings/${id}/mark-as-rented`, { rented_via_immoguinee: rentedViaImmoguinee }),

    reactivate: (id: string) =>
      apiClient.post(`/listings/${id}/reactivate`),

    search: async (params: Record<string, any>) => {
      const res = await apiClient.get('/listings/search', { params });
      normalizeListingsResponse(res);
      return res;
    },

    similar: (id: string) =>
      apiClient.get(`/listings/${id}/similar`),

    contact: (id: string, data: { message: string }) =>
      apiClient.post(`/listings/${id}/contact`, data),

    applyPremium: (id: string, data: { premium_type: string }) =>
      apiClient.post(`/listings/${id}/premium`, data),
  },

  // Contracts endpoints
  contracts: {
    list: (params?: Record<string, any>) =>
      apiClient.get('/contracts', { params }),

    my: (params?: Record<string, any>) =>
      apiClient.get('/contracts/my', { params }),

    get: (id: string) =>
      apiClient.get(`/contracts/${id}`),

    create: (data: any) =>
      apiClient.post('/contracts', data),

    preview: (id: string) =>
      apiClient.get(`/contracts/${id}/preview`, { responseType: 'blob' }),

    download: (id: string) =>
      apiClient.get(`/contracts/${id}/download`, { responseType: 'blob' }),

    requestSignatureOtp: (id: string) =>
      apiClient.post(`/contracts/${id}/sign/request-otp`),

    sign: (id: string, data: { otp_code: string }) =>
      apiClient.post(`/contracts/${id}/sign`, data),

    cancel: (id: string) =>
      apiClient.post(`/contracts/${id}/cancel`),
  },

  // Payments endpoints
  payments: {
    list: (params?: Record<string, any>) =>
      apiClient.get('/payments', { params }),

    get: (id: string) =>
      apiClient.get(`/payments/${id}`),

    create: (data: any) =>
      apiClient.post('/payments', data),

    checkStatus: (id: string) =>
      apiClient.get(`/payments/${id}/status`),
  },

  // Health check
  health: () =>
    apiClient.get('/health'),

  // Favorites endpoints
  favorites: {
    // Normalize each favourited listing to the UI shape (keeps added_at).
    list: async () => {
      const res = await apiClient.get('/favorites');
      const favs = res.data?.data?.favorites ?? [];
      res.data = { data: { favorites: favs.map(mapRustListing) } };
      return res;
    },

    add: (listingId: string) =>
      apiClient.post('/favorites', { listing_id: listingId }),

    remove: (listingId: string) =>
      apiClient.delete(`/favorites/${listingId}`),

    check: (listingId: string) =>
      apiClient.get(`/favorites/${listingId}/check`),

    toggle: (listingId: string) =>
      apiClient.post(`/favorites/${listingId}/toggle`),
  },

  // Visits endpoints
  visits: {
    // The Rust API returns { data: { visits: [...] } }. Reshape to what each page
    // reads: VisitsContent -> data.data (array); the dashboard -> data (array).
    list: async (params?: Record<string, any>) => {
      const res = await apiClient.get('/visits', { params });
      res.data = { data: { data: (res.data?.data?.visits ?? []).map(mapVisit) } };
      return res;
    },

    upcoming: async () => {
      const res = await apiClient.get('/visits/upcoming');
      res.data = { data: (res.data?.data?.visits ?? []).map(mapVisit) };
      return res;
    },

    byDate: (date: string) =>
      apiClient.get('/visits/by-date', { params: { date } }),

    // Rust stats use French keys; the UI reads pending/confirmed/completed/cancelled.
    stats: async () => {
      const res = await apiClient.get('/visits/stats');
      const s = res.data?.data ?? {};
      res.data = {
        data: {
          pending: s.en_attente ?? 0,
          confirmed: s.confirmees ?? 0,
          completed: s.completees ?? 0,
          cancelled: s.annulees ?? 0,
          total: s.total ?? 0,
        },
      };
      return res;
    },

    forListing: (listingId: string, params?: Record<string, any>) =>
      apiClient.get(`/visits/listing/${listingId}`, { params }),

    get: async (id: string) => {
      const res = await apiClient.get(`/visits/${id}`);
      if (res?.data?.data) res.data.data = mapVisit(res.data.data);
      return res;
    },

    create: async (data: {
      listing_id: string;
      client_nom: string;
      client_telephone: string;
      client_email?: string;
      date_visite: string;
      heure_visite: string;
      duree_minutes?: number;
      notes?: string;
    }) => {
      const res = await apiClient.post('/visits', data);
      if (res?.data?.data) res.data.data = mapVisit(res.data.data);
      return res;
    },

    update: (id: string, data: Record<string, any>) =>
      apiClient.patch(`/visits/${id}`, data),

    confirm: async (id: string) => {
      const res = await apiClient.post(`/visits/${id}/confirm`);
      if (res?.data?.data) res.data.data = mapVisit(res.data.data);
      return res;
    },

    complete: async (id: string) => {
      const res = await apiClient.post(`/visits/${id}/complete`);
      if (res?.data?.data) res.data.data = mapVisit(res.data.data);
      return res;
    },

    cancel: async (id: string, motif?: string) => {
      const res = await apiClient.post(`/visits/${id}/cancel`, { motif });
      if (res?.data?.data) res.data.data = mapVisit(res.data.data);
      return res;
    },

    delete: (id: string) =>
      apiClient.delete(`/visits/${id}`),
  },

  // Messaging endpoints
  messaging: {
    conversations: () =>
      apiClient.get('/messaging/conversations'),

    // Initial messaging routes through WhatsApp: notify the owner via the contact
    // endpoint (the backend sends a WhatsApp message through Evolution API).
    startConversation: (data: { listing_id: string; message?: string }) =>
      apiClient.post(`/listings/${data.listing_id}/contact`, { message: data.message ?? '' }),

    getMessages: (conversationId: string) =>
      apiClient.get(`/messaging/${conversationId}/messages`),

    sendMessage: (conversationId: string, data: { type_message: string; contenu?: string; fichier?: File }) => {
      if (data.fichier) {
        const formData = new FormData();
        formData.append('type_message', data.type_message);
        if (data.contenu) formData.append('contenu', data.contenu);
        formData.append('fichier', data.fichier);
        return apiClient.post(`/messaging/${conversationId}/messages`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      return apiClient.post(`/messaging/${conversationId}/messages`, data);
    },

    archive: (conversationId: string) =>
      apiClient.post(`/messaging/${conversationId}/archive`),

    reportMessage: (messageId: string, raison: string) =>
      apiClient.post(`/messaging/messages/${messageId}/report`, { raison }),
  },

  // Facebook integration endpoints
  facebook: {
    status: () =>
      apiClient.get('/facebook/status'),

    connect: () =>
      apiClient.post('/facebook/connect'),

    disconnect: () =>
      apiClient.delete('/facebook/disconnect'),

    toggleAutoPublish: (enabled: boolean) =>
      apiClient.post('/facebook/toggle-auto-publish', { enabled }),

    refreshToken: () =>
      apiClient.post('/facebook/refresh-token'),

    posts: (params?: Record<string, any>) =>
      apiClient.get('/facebook/posts', { params }),

    statistics: () =>
      apiClient.get('/facebook/statistics'),

    publishListing: (listingId: string) =>
      apiClient.post(`/listings/${listingId}/facebook/publish`),

    deleteListing: (listingId: string) =>
      apiClient.delete(`/listings/${listingId}/facebook`),
  },

  // Admin endpoints
  admin: {
    sidebarCounts: () =>
      apiClient.get('/admin/sidebar-counts'),

    dashboardStats: () =>
      apiClient.get('/admin/dashboard-stats'),

    analytics: (period: number = 30) =>
      apiClient.get(`/admin/analytics?period=${period}`),

    // Listings management
    listings: (params?: Record<string, any>) =>
      apiClient.get('/admin/listings', { params }),

    moderationQueue: () =>
      apiClient.get('/admin/moderation/listings'),

    moderateListing: (listingId: string, data: { action: string; reason?: string }) =>
      apiClient.post(`/admin/moderation/listings/${listingId}`, data),

    deleteListing: (listingId: string) =>
      apiClient.delete(`/admin/listings/${listingId}`),

    // Users management
    users: (params?: Record<string, any>) =>
      apiClient.get('/admin/users', { params }),

    manageUser: (userId: string, data: { action: string; reason?: string }) =>
      apiClient.post(`/admin/users/${userId}`, data),

    // Contracts management
    contracts: (params?: Record<string, any>) =>
      apiClient.get('/admin/contracts', { params }),

    // Payments management
    payments: (params?: Record<string, any>) =>
      apiClient.get('/admin/payments', { params }),

    // Messages management
    messages: (params?: Record<string, any>) =>
      apiClient.get('/admin/messages', { params }),

    // Disputes management
    disputes: (params?: Record<string, any>) =>
      apiClient.get('/admin/disputes', { params }),

    // Ratings management
    ratings: (params?: Record<string, any>) =>
      apiClient.get('/admin/ratings', { params }),

    // Certifications management
    certifications: (params?: Record<string, any>) =>
      apiClient.get('/admin/certifications', { params }),

    // Insurances management
    insurances: (params?: Record<string, any>) =>
      apiClient.get('/admin/insurances', { params }),

    // Visits management
    visits: (params?: Record<string, any>) =>
      apiClient.get('/admin/visits', { params }),

    visitStats: () =>
      apiClient.get('/admin/visits/stats'),

    // Audit logs
    auditLogs: (params?: Record<string, any>) =>
      apiClient.get('/admin/logs', { params }),
  },
};

// Export axios instance for custom requests
export { apiClient };
export default apiClient;

// Export types for TypeScript
export type ApiResponse<T = any> = {
  success: boolean;
  data: T;
  message?: string;
};

export type ApiError = {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
};
