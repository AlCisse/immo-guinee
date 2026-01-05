import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true, // CRITICAL: Send httpOnly cookies with requests
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor - No need to add token manually, httpOnly cookie is sent automatically
apiClient.interceptors.request.use(
  (config) => {
    // Token is now stored in httpOnly cookie and sent automatically
    // No localStorage access needed - this protects against XSS attacks
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const responseData = error.response?.data as { requires_2fa?: boolean; requires_2fa_setup?: boolean; message?: string } | undefined;

    // Handle 401 Unauthorized or 404 Not Found on auth endpoints
    const status = error.response?.status;
    if ((status === 401 || status === 404) && !originalRequest._retry) {
      originalRequest._retry = true;

      // Clear local user data
      // Note: httpOnly cookie will be cleared by the server on logout
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');

        // Only redirect to login if NOT on auth endpoints (to avoid loops)
        // /auth/me returns 401/404 for unauthenticated users - this is expected
        const url = originalRequest.url || '';
        const isAuthEndpoint = url.includes('/auth/');

        if (!isAuthEndpoint && status === 401) {
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
    if (error.response?.status === 419) {
      // Retry the request once
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

// API Methods
export const api = {
  // Auth endpoints
  auth: {
    register: (data: { telephone: string; mot_de_passe: string; nom_complet: string; type_compte: string }) =>
      apiClient.post('/auth/register', data),

    verifyOtp: (data: { telephone: string; otp_code: string }) =>
      apiClient.post('/auth/otp/verify', { telephone: data.telephone, code: data.otp_code }),

    resendOtp: (data: { telephone: string }) =>
      apiClient.post('/auth/otp/resend', data),

    login: (data: { telephone: string; mot_de_passe: string }) =>
      apiClient.post('/auth/login', data),

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
    list: (params?: Record<string, any>) =>
      apiClient.get('/listings', { params }),

    my: (params?: Record<string, any>) =>
      apiClient.get('/listings/my', { params }),

    get: (id: string) =>
      apiClient.get(`/listings/${id}`),

    create: (data: FormData) =>
      apiClient.post('/listings', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 minutes for photo uploads
      }),

    update: (id: string, data: FormData) => {
      // Use dedicated POST endpoint for FormData with file uploads
      return apiClient.post(`/listings/${id}/update`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 minutes for photo uploads
      });
    },

    delete: (id: string) =>
      apiClient.delete(`/listings/${id}`),

    markAsRented: (id: string) =>
      apiClient.patch(`/listings/${id}`, { disponible: false, statut: 'ARCHIVEE' }),

    reactivate: (id: string) =>
      apiClient.patch(`/listings/${id}`, { disponible: true, statut: 'ACTIVE' }),

    search: (params: Record<string, any>) =>
      apiClient.get('/listings/search', { params }),

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
    list: () =>
      apiClient.get('/favorites'),

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
    list: (params?: Record<string, any>) =>
      apiClient.get('/visits', { params }),

    upcoming: () =>
      apiClient.get('/visits/upcoming'),

    byDate: (date: string) =>
      apiClient.get('/visits/by-date', { params: { date } }),

    stats: () =>
      apiClient.get('/visits/stats'),

    forListing: (listingId: string, params?: Record<string, any>) =>
      apiClient.get(`/visits/listing/${listingId}`, { params }),

    get: (id: string) =>
      apiClient.get(`/visits/${id}`),

    create: (data: {
      listing_id: string;
      client_nom: string;
      client_telephone: string;
      client_email?: string;
      date_visite: string;
      heure_visite: string;
      duree_minutes?: number;
      notes?: string;
    }) =>
      apiClient.post('/visits', data),

    update: (id: string, data: Record<string, any>) =>
      apiClient.patch(`/visits/${id}`, data),

    confirm: (id: string) =>
      apiClient.post(`/visits/${id}/confirm`),

    complete: (id: string) =>
      apiClient.post(`/visits/${id}/complete`),

    cancel: (id: string, motif?: string) =>
      apiClient.post(`/visits/${id}/cancel`, { motif }),

    delete: (id: string) =>
      apiClient.delete(`/visits/${id}`),
  },

  // Messaging endpoints
  messaging: {
    conversations: () =>
      apiClient.get('/messaging/conversations'),

    startConversation: (data: { listing_id: string; message?: string }) =>
      apiClient.post('/messaging/conversations/start', data),

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
