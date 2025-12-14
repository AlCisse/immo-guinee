import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api, ApiResponse } from '../api/client';
import { User } from './AuthContext';

/**
 * React Query hooks for authentication operations
 * Complements AuthContext with React Query-based state management
 */

interface LoginCredentials {
  telephone: string;
  mot_de_passe: string;
}

interface RegisterData {
  telephone: string;
  mot_de_passe: string;
  nom_complet: string;
  type_compte: 'PARTICULIER' | 'PROPRIETAIRE' | 'AGENT' | 'AGENCE';
  email?: string;
}

interface OtpVerification {
  telephone: string;
  otp_code: string;
}

interface ResendOtpData {
  telephone: string;
}

// Query Keys
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
};

/**
 * Get redirect path based on user roles
 * Priority: admin > moderator > mediator > proprietaire/agence > chercheur
 */
function getRedirectPathByRole(user: User): string {
  const roles = user.roles || [];

  // Admin goes to admin dashboard
  if (roles.includes('admin')) {
    return '/admin';
  }

  // Moderator goes to moderator dashboard
  if (roles.includes('moderator')) {
    return '/moderator';
  }

  // Mediator goes to mediator dashboard
  if (roles.includes('mediator')) {
    return '/mediator';
  }

  // Proprietaire/Agence goes to their dashboard
  if (roles.includes('proprietaire') || roles.includes('agence') ||
      user.type_compte === 'PROPRIETAIRE' || user.type_compte === 'AGENCE') {
    return '/dashboard';
  }

  // Chercheur/Particulier goes to home
  return '/';
}

/**
 * Hook to fetch current user data
 */
export function useUser() {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return null;

      const response = await api.auth.me();
      const data: ApiResponse<{ user: User }> = response.data;

      if (data.success && data.data.user) {
        return data.data.user;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to login user
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await api.auth.login(credentials);
      const data: ApiResponse<{ access_token: string; user: User }> = response.data;

      if (!data.success || !data.data.access_token) {
        throw new Error(data.message || 'Login failed');
      }

      return data.data;
    },
    onSuccess: (data) => {
      // Store token and user
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Update React Query cache
      queryClient.setQueryData(authKeys.user(), data.user);

      // Redirect based on user role
      const redirectPath = getRedirectPathByRole(data.user);
      router.push(redirectPath);
    },
  });
}

/**
 * Hook to register new user
 */
export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await api.auth.register(data);
      const result: ApiResponse = response.data;

      if (!result.success) {
        throw new Error(result.message || 'Registration failed');
      }

      return { telephone: data.telephone };
    },
    onSuccess: (data) => {
      // Navigate to OTP verification
      router.push(`/auth/verify-otp?telephone=${encodeURIComponent(data.telephone)}`);
    },
  });
}

/**
 * Hook to verify OTP
 */
export function useVerifyOtp() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: OtpVerification) => {
      const response = await api.auth.verifyOtp(data);
      const result: ApiResponse<{ access_token: string; user: User }> = response.data;

      if (!result.success || !result.data.access_token) {
        throw new Error(result.message || 'OTP verification failed');
      }

      return result.data;
    },
    onSuccess: (data) => {
      // Store token and user
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Update React Query cache
      queryClient.setQueryData(authKeys.user(), data.user);

      // Redirect based on user role
      const redirectPath = getRedirectPathByRole(data.user);
      router.push(redirectPath);
    },
  });
}

/**
 * Hook to resend OTP
 */
export function useResendOtp() {
  return useMutation({
    mutationFn: async (data: ResendOtpData) => {
      const response = await api.auth.resendOtp(data);
      const result: ApiResponse = response.data;

      if (!result.success) {
        throw new Error(result.message || 'Failed to resend OTP');
      }

      return result;
    },
  });
}

/**
 * Hook to logout user
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      try {
        await api.auth.logout();
      } catch (error) {
        console.error('Logout error:', error);
      }
    },
    onSettled: () => {
      // Clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');

      // Clear React Query cache
      queryClient.setQueryData(authKeys.user(), null);
      queryClient.clear();

      // Redirect to home
      router.push('/');
    },
  });
}

/**
 * Hook to update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await api.auth.updateProfile(data);
      const result: ApiResponse<{ user: User }> = response.data;

      if (!result.success || !result.data.user) {
        throw new Error(result.message || 'Failed to update profile');
      }

      return result.data.user;
    },
    onSuccess: (updatedUser) => {
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Update React Query cache
      queryClient.setQueryData(authKeys.user(), updatedUser);

      // Invalidate user query to refetch
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
    },
  });
}

/**
 * Combined auth hook with all operations
 * Can be used as an alternative to useAuth from AuthContext
 */
export function useAuthQuery() {
  const { data: user, isLoading } = useUser();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const verifyOtpMutation = useVerifyOtp();
  const resendOtpMutation = useResendOtp();
  const logoutMutation = useLogout();
  const updateProfileMutation = useUpdateProfile();

  return {
    // User state
    user,
    isLoading,
    isAuthenticated: !!user,

    // Mutations
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,

    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,

    verifyOtp: verifyOtpMutation.mutate,
    verifyOtpAsync: verifyOtpMutation.mutateAsync,
    isVerifyingOtp: verifyOtpMutation.isPending,
    verifyOtpError: verifyOtpMutation.error,

    resendOtp: resendOtpMutation.mutate,
    resendOtpAsync: resendOtpMutation.mutateAsync,
    isResendingOtp: resendOtpMutation.isPending,
    resendOtpError: resendOtpMutation.error,

    logout: logoutMutation.mutate,
    logoutAsync: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,

    updateProfile: updateProfileMutation.mutate,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    updateProfileError: updateProfileMutation.error,
  };
}
