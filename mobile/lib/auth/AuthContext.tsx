import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { api, tokenManager, ApiResponse } from '../api/client';

// User type matching backend
export interface User {
  id: string;
  nom_complet: string;
  telephone: string;
  email?: string;
  type_compte: 'PARTICULIER' | 'PROFESSIONNEL' | 'AGENCE';
  photo_profil?: string;
  badge?: string;
  telephone_verifie: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (telephone: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  verifyOtp: (telephone: string, code: string) => Promise<void>;
  resendOtp: (telephone: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  nom_complet: string;
  telephone: string;
  mot_de_passe: string;
  type_compte: 'PARTICULIER' | 'PROFESSIONNEL' | 'AGENCE';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from secure storage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await tokenManager.getToken();
        if (token) {
          const storedUser = await tokenManager.getUser();
          if (storedUser) {
            setUser(storedUser);
          }
          // Verify token is still valid
          try {
            const response = await api.auth.me();
            if (response.data?.success && response.data?.data?.user) {
              const userData = response.data.data.user;
              setUser(userData);
              await tokenManager.setUser(userData);
            }
          } catch (error) {
            // Token is invalid, clear storage
            await tokenManager.clear();
            setUser(null);
          }
        }
      } catch (error) {
        if (__DEV__) console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (telephone: string, password: string) => {
    try {
      const response = await api.auth.login({
        telephone,
        mot_de_passe: password,
      });

      const data = response.data as ApiResponse;
      const { token, user: userData, action } = data.data || {};

      // Check if user needs to verify OTP
      if (data.success && action === 'verify_otp') {
        router.push({
          pathname: '/auth/verify-otp',
          params: { telephone: userData?.telephone || telephone },
        });
        return;
      }

      if (token && userData) {
        await tokenManager.setToken(token);
        await tokenManager.setUser(userData);
        setUser(userData);
        router.replace('/(tabs)');
      } else {
        throw new Error(data.message || 'Erreur de connexion');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Erreur de connexion';
      throw new Error(message);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      const response = await api.auth.register(data);
      const result = response.data as ApiResponse;

      if (result.success) {
        const { action, user: userData } = result.data || {};
        const telephone = userData?.telephone || data.telephone;

        if (action === 'verify_otp') {
          router.push({
            pathname: '/auth/verify-otp',
            params: { telephone },
          });
        } else {
          router.push({
            pathname: '/auth/verify-otp',
            params: { telephone },
          });
        }
      } else {
        throw new Error(result.message || 'Erreur lors de l\'inscription');
      }
    } catch (error: any) {
      // Handle existing verified account
      if (error.response?.status === 409) {
        const responseData = error.response.data;
        if (responseData?.data?.action === 'redirect_login') {
          router.replace('/auth/login');
          throw new Error('Ce compte existe deja. Veuillez vous connecter.');
        }
      }
      const message = error.response?.data?.message || error.message || 'Erreur lors de l\'inscription';
      throw new Error(message);
    }
  }, []);

  const verifyOtp = useCallback(async (telephone: string, code: string) => {
    try {
      const response = await api.auth.verifyOtp({ telephone, otp_code: code });
      const data = response.data as ApiResponse;

      if (data.success) {
        const { token, user: userData } = data.data || {};
        if (token && userData) {
          await tokenManager.setToken(token);
          await tokenManager.setUser(userData);
          setUser(userData);
          router.replace('/(tabs)');
        } else {
          // OTP verified but need to login
          router.replace('/auth/login');
        }
      } else {
        throw new Error(data.message || 'Code invalide');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Erreur de verification';
      throw new Error(message);
    }
  }, []);

  const resendOtp = useCallback(async (telephone: string) => {
    try {
      const response = await api.auth.resendOtp({ telephone });
      const data = response.data as ApiResponse;
      if (!data.success) {
        throw new Error(data.message || 'Erreur lors de l\'envoi du code');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Erreur lors de l\'envoi du code';
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      // Ignore logout errors
    } finally {
      await tokenManager.clear();
      setUser(null);
      router.replace('/auth/login');
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.auth.me();
      if (response.data?.success && response.data?.data?.user) {
        const userData = response.data.data.user;
        setUser(userData);
        await tokenManager.setUser(userData);
      }
    } catch (error) {
      if (__DEV__) console.error('Error refreshing user:', error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
