import api, { storeTokens, clearTokens } from './api';
import { User, AuthTokens } from '../types';

interface LoginResponse {
  user: User;
  token: AuthTokens;
}

interface RegisterData {
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  password: string;
  password_confirmation: string;
}

interface OTPResponse {
  message: string;
  expires_in: number;
}

// Request OTP for login
export const requestLoginOTP = async (telephone: string): Promise<OTPResponse> => {
  const response = await api.post<OTPResponse>('/auth/otp/request', {
    telephone,
    type: 'login',
  });
  return response.data;
};

// Verify OTP and login
export const verifyLoginOTP = async (telephone: string, otp: string): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/otp/verify', {
    telephone,
    otp,
  });
  await storeTokens(response.data.token);
  return response.data;
};

// Register new user
export const register = async (data: RegisterData): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>('/auth/register', data);
  return response.data;
};

// Verify registration OTP
export const verifyRegistrationOTP = async (telephone: string, otp: string): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/register/verify', {
    telephone,
    otp,
  });
  await storeTokens(response.data.token);
  return response.data;
};

// Login with password (fallback)
export const loginWithPassword = async (telephone: string, password: string): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/login', {
    telephone,
    password,
  });
  await storeTokens(response.data.token);
  return response.data;
};

// Get current user
export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<{ data: User }>('/auth/me');
  return response.data.data;
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } finally {
    await clearTokens();
  }
};

// Update profile
export const updateProfile = async (data: Partial<User>): Promise<User> => {
  const response = await api.put<{ data: User }>('/auth/profile', data);
  return response.data.data;
};

// Request password reset
export const requestPasswordReset = async (telephone: string): Promise<OTPResponse> => {
  const response = await api.post<OTPResponse>('/auth/password/forgot', {
    telephone,
  });
  return response.data;
};

// Reset password with OTP
export const resetPassword = async (
  telephone: string,
  otp: string,
  password: string,
  password_confirmation: string
): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>('/auth/password/reset', {
    telephone,
    otp,
    password,
    password_confirmation,
  });
  return response.data;
};
