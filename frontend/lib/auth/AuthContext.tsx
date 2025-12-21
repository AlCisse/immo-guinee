'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiResponse } from '../api/client';
import toast from 'react-hot-toast';

// User type based on Laravel backend
export interface User {
  id: string;
  telephone: string;
  nom_complet: string;
  email?: string;
  type_compte: 'PARTICULIER' | 'PROPRIETAIRE' | 'AGENT' | 'AGENCE';
  badge: 'BRONZE' | 'ARGENT' | 'OR' | 'DIAMANT';
  statut_verification: 'NON_VERIFIE' | 'EN_ATTENTE' | 'VERIFIE' | 'REJETE';
  is_active: boolean;
  telephone_verified_at: string | null;
  total_transactions: number;
  avg_rating: number;
  notification_preferences: {
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
    telegram: boolean;
  };
  roles: string[];
  permissions: string[];
  created_at: string;
  updated_at: string;
}

// Redirect data from login response
export interface RedirectData {
  redirect_url: string;
  dashboard_path: string;
  primary_role: string | null;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  redirectData: RedirectData | null;
  login: (telephone: string, mot_de_passe: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  verifyOtp: (telephone: string, otp_code: string) => Promise<void>;
  resendOtp: (telephone: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
  isMediator: () => boolean;
  hasVerifiedPhone: () => boolean;
  requirePhoneVerification: (action?: string) => boolean;
}

interface RegisterData {
  telephone: string;
  mot_de_passe: string;
  nom_complet: string;
  type_compte: 'PARTICULIER' | 'PROPRIETAIRE' | 'AGENT' | 'AGENCE';
  email?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [redirectData, setRedirectData] = useState<RedirectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
          setUser(JSON.parse(storedUser));
          // Verify token is still valid
          await refreshUser();
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (telephone: string, mot_de_passe: string) => {
    try {
      const response = await api.auth.login({ telephone, mot_de_passe });
      const data: ApiResponse<{
        token: string;
        user: User;
        redirect: RedirectData;
        action?: string;
      }> = response.data;

      console.log('Login response:', data);

      // Handle both possible response structures (token vs access_token)
      const responseData = data.data || data;
      const action = responseData.action;
      const token = responseData.token || responseData.access_token || (data as any).token || (data as any).access_token;
      const user = responseData.user || (data as any).user;
      const redirect = responseData.redirect || (data as any).redirect;

      // Check if user needs to verify OTP (unverified phone)
      if (data.success && action === 'verify_otp') {
        const userPhone = user?.telephone || telephone;
        toast('Veuillez vérifier votre numéro pour continuer', {
          duration: 4000,
          icon: '📱',
        });
        router.push(`/auth/verify-otp?telephone=${encodeURIComponent(userPhone)}`);
        return;
      }

      if (data.success && token) {
        // Store token and user
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        if (redirect) {
          localStorage.setItem('redirect_data', JSON.stringify(redirect));
        }

        setUser(user);
        setRedirectData(redirect || null);

        // Redirect to role-based dashboard
        const redirectPath = redirect?.dashboard_path || '/dashboard';
        router.push(redirectPath);
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await api.auth.register(data);
      const result: ApiResponse<{ action?: string; telephone?: string; user?: any }> = response.data;

      if (result.success) {
        // Check the action returned by the API
        const action = result.data?.action;
        const telephone = result.data?.user?.telephone || data.telephone;

        if (action === 'verify_otp') {
          // User needs to verify OTP (new user or existing unverified user)
          toast.success('Code de vérification envoyé par WhatsApp', {
            duration: 4000,
            icon: '📱',
          });
          router.push(`/auth/verify-otp?telephone=${encodeURIComponent(telephone)}`);
        } else {
          // Default: navigate to OTP verification
          toast.success('Code de vérification envoyé par WhatsApp', {
            duration: 4000,
            icon: '📱',
          });
          router.push(`/auth/verify-otp?telephone=${encodeURIComponent(telephone)}`);
        }
      } else {
        throw new Error(result.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);

      // Handle 409 Conflict - user already exists and is verified
      if (error.response?.status === 409) {
        const responseData = error.response.data;
        if (responseData?.data?.action === 'redirect_login') {
          // Throw a special error that the registration page can handle
          const redirectError = new Error(responseData.message || 'Ce compte existe déjà. Veuillez vous connecter.');
          (redirectError as any).action = 'redirect_login';
          (redirectError as any).telephone = responseData.data.telephone;
          throw redirectError;
        }
      }

      throw error;
    }
  };

  const verifyOtp = async (telephone: string, otp_code: string) => {
    try {
      const response = await api.auth.verifyOtp({ telephone, otp_code });
      const data: ApiResponse<{
        token: string;
        user: User;
        redirect: RedirectData;
      }> = response.data;

      console.log('OTP verification response:', data);

      // Handle both possible response structures (token vs access_token)
      const responseData = data.data || data;
      const token = responseData.token || responseData.access_token || (data as any).token || (data as any).access_token;
      const user = responseData.user || (data as any).user;
      const redirect = responseData.redirect || (data as any).redirect;

      if (data.success && token) {
        // Store token and user
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        if (redirect) {
          localStorage.setItem('redirect_data', JSON.stringify(redirect));
        }

        setUser(user);
        setRedirectData(redirect || null);

        // Redirect to role-based dashboard
        const redirectPath = redirect?.dashboard_path || '/dashboard';
        router.push(redirectPath);
      } else {
        throw new Error(data.message || 'OTP verification failed');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      throw error;
    }
  };

  const resendOtp = async (telephone: string) => {
    try {
      const response = await api.auth.resendOtp({ telephone });
      const data: ApiResponse = response.data;

      if (!data.success) {
        throw new Error(data.message || 'Failed to resend OTP');
      }
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Only call API if we have a token (backend might not be available in dev)
      const token = localStorage.getItem('access_token');
      if (token) {
        await api.auth.logout().catch(() => {
          // Silently ignore network errors - we'll clean up locally anyway
        });
      }
    } finally {
      // Clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      setUser(null);

      // Redirect to home
      router.push('/');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.auth.me();
      const data: ApiResponse<{ user: User; redirect: RedirectData }> = response.data;

      if (data.success && data.data.user) {
        setUser(data.data.user);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        if (data.data.redirect) {
          setRedirectData(data.data.redirect);
          localStorage.setItem('redirect_data', JSON.stringify(data.data.redirect));
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails, logout
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('redirect_data');
      setUser(null);
      setRedirectData(null);
    }
  };

  // Role checking functions
  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) || false;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => user?.roles?.includes(role)) || false;
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) || false;
  };

  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  const isMediator = (): boolean => {
    return hasRole('mediator');
  };

  // Phone verification functions
  const hasVerifiedPhone = (): boolean => {
    return !!user?.telephone_verified_at;
  };

  /**
   * Check if phone is verified, if not redirect to verify page with OTP
   * @param action - Optional action description to show in toast
   * @returns true if verified, false if redirecting to verify
   */
  const requirePhoneVerification = (action?: string): boolean => {
    if (!user) {
      // Not logged in, redirect to login
      router.push('/auth/login');
      return false;
    }

    if (hasVerifiedPhone()) {
      return true;
    }

    // Phone not verified - resend OTP and redirect to verify page
    const actionText = action || 'effectuer cette action';
    toast(
      `Vous devez vérifier votre numéro pour ${actionText}. Un code a été envoyé sur WhatsApp.`,
      {
        duration: 5000,
        icon: '📱',
      }
    );

    // Resend OTP in background
    resendOtp(user.telephone).catch(() => {
      // Silent fail - user will be able to request resend on verify page
    });

    // Redirect to verify page
    router.push(`/auth/verify-otp?telephone=${encodeURIComponent(user.telephone)}`);
    return false;
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    redirectData,
    login,
    register,
    verifyOtp,
    resendOtp,
    logout,
    refreshUser,
    hasRole,
    hasAnyRole,
    hasPermission,
    isAdmin,
    isMediator,
    hasVerifiedPhone,
    requirePhoneVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Protected Route component
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/connexion?redirect=' + encodeURIComponent(window.location.pathname));
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-neutral-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// Admin Route component - requires admin role
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isAdmin, redirectData } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/connexion?redirect=' + encodeURIComponent(window.location.pathname));
      } else if (!isAdmin()) {
        // Redirect non-admin users to their appropriate dashboard silently
        const redirectPath = redirectData?.dashboard_path || '/';
        router.push(redirectPath);
      }
    }
  }, [isAuthenticated, isLoading, isAdmin, redirectData, router]);

  // Show loading spinner while checking auth or redirecting
  if (isLoading || !isAuthenticated || !isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-neutral-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Role-based Route component - requires specific roles
export function RoleRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: string[];
}) {
  const { isAuthenticated, isLoading, hasAnyRole, redirectData } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/connexion?redirect=' + encodeURIComponent(window.location.pathname));
      } else if (!hasAnyRole(roles)) {
        const redirectPath = redirectData?.dashboard_path || '/';
        router.push(redirectPath);
      }
    }
  }, [isAuthenticated, isLoading, hasAnyRole, roles, redirectData, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-neutral-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !hasAnyRole(roles)) {
    return null;
  }

  return <>{children}</>;
}
