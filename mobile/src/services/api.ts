import axios, { AxiosError, AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants/config';
import { AuthTokens, ApiError } from '../types';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Token storage keys
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Store tokens securely
export const storeTokens = async (tokens: AuthTokens): Promise<void> => {
  await SecureStore.setItemAsync(TOKEN_KEY, tokens.access_token);
};

// Get stored token
export const getStoredToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(TOKEN_KEY);
};

// Clear tokens
export const clearTokens = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};

// Request interceptor - Add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear and redirect to login
      await clearTokens();
      // The auth state listener will handle navigation
    }
    return Promise.reject(error);
  }
);

export default api;

// Helper to format API errors
export const formatApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    if (apiError?.message) {
      return apiError.message;
    }
    if (apiError?.errors) {
      const firstError = Object.values(apiError.errors)[0];
      return firstError?.[0] || 'Une erreur est survenue';
    }
    if (error.message === 'Network Error') {
      return 'Erreur de connexion. Vérifiez votre connexion internet.';
    }
  }
  return 'Une erreur inattendue est survenue';
};
