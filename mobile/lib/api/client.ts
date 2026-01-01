import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

// API URL - change this to your production URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://immoguinee.com/api';

// Security: Expected SSL certificate public key hash (SHA-256)
// Update this when renewing SSL certificate
const EXPECTED_SSL_PINS = [
  // Primary certificate pin (Let's Encrypt)
  process.env.EXPO_PUBLIC_SSL_PIN_PRIMARY || '',
  // Backup certificate pin
  process.env.EXPO_PUBLIC_SSL_PIN_BACKUP || '',
];

// Security: Allowed API domains
const ALLOWED_DOMAINS = ['immoguinee.com', 'api.immoguinee.com'];

// Validate URL is from trusted domain
const isValidDomain = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // In development mode, allow localhost and local network IPs
    if (__DEV__) {
      // Allow localhost
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return true;
      }
      // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname)) {
        return true;
      }
    }

    return ALLOWED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
};

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-App-Version': process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  },
  timeout: 90000, // 90 seconds timeout for slow mobile networks
});


// Token management with SecureStore
export const tokenManager = {
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('access_token');
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync('access_token', token);
  },

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync('access_token');
  },

  async getUser(): Promise<any | null> {
    try {
      const user = await SecureStore.getItemAsync('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  async setUser(user: any): Promise<void> {
    await SecureStore.setItemAsync('user', JSON.stringify(user));
  },

  async removeUser(): Promise<void> {
    await SecureStore.deleteItemAsync('user');
  },

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync('access_token'),
      SecureStore.deleteItemAsync('user'),
    ]);
  },
};

// Request interceptor - Add auth token and security checks
apiClient.interceptors.request.use(
  async (config) => {
    // Security: Validate request URL domain
    const fullUrl = config.baseURL ? `${config.baseURL}${config.url}` : config.url || '';
    if (fullUrl && !isValidDomain(fullUrl)) {
      if (__DEV__) console.error('[API] Security: Blocked request to untrusted domain:', fullUrl);
      return Promise.reject(new Error('Untrusted domain'));
    }

    // Add auth token
    const token = await tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Security: Add request timestamp for replay protection
    config.headers['X-Request-Time'] = Date.now().toString();

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      await tokenManager.clear();
    }

    return Promise.reject(error);
  }
);

// API Methods - Compatible with frontend/lib/api/client.ts
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
      apiClient.post('/auth/logout', {}, { timeout: 3000 }),

    me: () =>
      apiClient.get('/auth/me'),

    updateProfile: (data: any) =>
      apiClient.patch('/auth/me', data),

    // Push notification token management
    registerPushToken: (data: { token: string; platform: 'ios' | 'android' }) =>
      apiClient.post('/auth/push-token', data),

    removePushToken: (token: string) =>
      apiClient.delete(`/auth/push-token/${encodeURIComponent(token)}`),

    // Online status
    setOnlineStatus: (isOnline: boolean) =>
      apiClient.post('/users/online-status', { is_online: isOnline }),
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
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        timeout: 180000, // 3 minutes for photo uploads
        transformRequest: (data) => data, // Don't transform FormData
      }),

    update: (id: string, data: FormData) =>
      apiClient.post(`/listings/${id}/update`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      }),

    delete: (id: string) =>
      apiClient.delete(`/listings/${id}`),

    search: (params: Record<string, any>) =>
      apiClient.get('/listings/search', { params }),

    similar: (id: string) =>
      apiClient.get(`/listings/${id}/similar`),

    contact: (id: string, data: { message: string }) =>
      apiClient.post(`/listings/${id}/contact`, data),
  },

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

    confirm: (id: string) =>
      apiClient.post(`/visits/${id}/confirm`),

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

    getMessages: (conversationId: string, params?: { page?: number }) =>
      apiClient.get(`/messaging/${conversationId}/messages`, { params }),

    sendMessage: (conversationId: string, data: FormData | { type_message: string; contenu?: string }) =>
      data instanceof FormData
        ? apiClient.post(`/messaging/${conversationId}/messages`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000, // 2 minutes for voice/media uploads
          })
        : apiClient.post(`/messaging/${conversationId}/messages`, data),

    // Real-time messaging endpoints
    sendTyping: (conversationId: string, isTyping: boolean) =>
      apiClient.post(`/messaging/${conversationId}/typing`, { is_typing: isTyping }),

    markDelivered: (messageId: string) =>
      apiClient.patch(`/messaging/messages/${messageId}/delivered`),

    markRead: (messageId: string) =>
      apiClient.patch(`/messaging/messages/${messageId}/read`),

    deleteMessage: (messageId: string, forEveryone: boolean = false) =>
      apiClient.delete(`/messaging/messages/${messageId}`, {
        params: { for_everyone: forEveryone },
      }),

    search: (conversationId: string, query: string) =>
      apiClient.get(`/messaging/${conversationId}/search`, {
        params: { q: query },
      }),

    archive: (conversationId: string) =>
      apiClient.post(`/messaging/${conversationId}/archive`),

    // E2E Encrypted Media endpoints
    uploadEncryptedMedia: (conversationId: string, formData: FormData) =>
      apiClient.post(`/messaging/${conversationId}/encrypted-media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000, // 3 minutes for large files
      }),

    downloadEncryptedMedia: (mediaId: string) =>
      apiClient.get(`/messaging/encrypted-media/${mediaId}/download`, {
        responseType: 'arraybuffer',
        timeout: 180000,
      }),

    confirmMediaDownload: (mediaId: string) =>
      apiClient.post(`/messaging/encrypted-media/${mediaId}/confirm-download`),

    getEncryptedMediaInfo: (mediaId: string) =>
      apiClient.get(`/messaging/encrypted-media/${mediaId}`),
  },

  // Contracts endpoints
  contracts: {
    list: (params?: Record<string, any>) =>
      apiClient.get('/contracts', { params }),

    my: (params?: Record<string, any>) =>
      apiClient.get('/contracts/my', { params }),

    get: (id: string) =>
      apiClient.get(`/contracts/${id}`),

    // Download contract PDF
    download: (id: string) =>
      apiClient.get(`/contracts/${id}/download`, {
        responseType: 'blob',
        timeout: 120000, // 2 minutes for PDF download
      }),

    // Preview contract PDF (inline)
    preview: (id: string) =>
      apiClient.get(`/contracts/${id}/preview`, {
        responseType: 'blob',
        timeout: 120000,
      }),

    // Get download URL for contract PDF
    getDownloadUrl: (id: string) =>
      `${API_URL}/contracts/${id}/download`,

    // Signature endpoints
    requestSignatureOtp: (id: string) =>
      apiClient.post(`/contracts/${id}/sign/request-otp`),

    sign: (id: string, otp: string) =>
      apiClient.post(`/contracts/${id}/sign`, { otp }),

    // Get signature certificate
    getSignatureCertificate: (id: string) =>
      apiClient.get(`/contracts/${id}/signature-certificate`),
  },

  // Notifications endpoints
  notifications: {
    list: () =>
      apiClient.get('/notifications'),

    markAsRead: (id: string) =>
      apiClient.post(`/notifications/${id}/read`),

    markAllAsRead: () =>
      apiClient.post('/notifications/read-all'),

    delete: (id: string) =>
      apiClient.delete(`/notifications/${id}`),

    sendTest: () =>
      apiClient.post('/notifications/test'),
  },

  // Health check
  health: () =>
    apiClient.get('/health'),

  // Commissions
  commissions: {
    list: () => apiClient.get('/commissions'),
    get: (type: string) => apiClient.get(`/commissions/${type}`),
  },

  // App Configuration (authenticated - security)
  config: {
    websocket: () => apiClient.get('/config/websocket'),
  },
};

// Export axios instance for custom requests
export { apiClient };
export default apiClient;

// Export types
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
