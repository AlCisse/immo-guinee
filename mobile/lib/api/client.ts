import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// API URL - change this to your production URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://immoguinee.com/api';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 60000, // 60 seconds timeout for mobile networks
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

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      await tokenManager.clear();
      // The auth context will handle navigation
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
  },

  // Messaging endpoints
  messaging: {
    conversations: () =>
      apiClient.get('/messaging/conversations'),

    startConversation: (data: { listing_id: string; message?: string }) =>
      apiClient.post('/messaging/conversations/start', data),

    getMessages: (conversationId: string) =>
      apiClient.get(`/messaging/${conversationId}/messages`),

    sendMessage: (conversationId: string, data: { type_message: string; contenu?: string }) =>
      apiClient.post(`/messaging/${conversationId}/messages`, data),
  },

  // Contracts endpoints
  contracts: {
    list: (params?: Record<string, any>) =>
      apiClient.get('/contracts', { params }),

    my: (params?: Record<string, any>) =>
      apiClient.get('/contracts/my', { params }),

    get: (id: string) =>
      apiClient.get(`/contracts/${id}`),
  },

  // Health check
  health: () =>
    apiClient.get('/health'),

  // Commissions
  commissions: {
    list: () => apiClient.get('/commissions'),
    get: (type: string) => apiClient.get(`/commissions/${type}`),
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
