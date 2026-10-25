import { apiClient, tokenStorage } from './client';
import { AuthResponse, User } from '../types';

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  timezone?: string;
  language?: 'en' | 'hi';
  acceptTerms: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface MeUpdateInput {
  name?: string;
  timezone?: string;
  language?: 'en' | 'hi';
  fontSize?: 'normal' | 'large' | 'xlarge';
}

export const authApi = {
  signup: async (input: SignupInput): Promise<AuthResponse> => {
    const tz = input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    const lang = input.language || 'en';
    const res = await apiClient<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: { ...input, timezone: tz, language: lang },
      skipAuth: true,
    });
    if (res.token) {
      tokenStorage.setAccessToken(res.token);
      tokenStorage.setRefreshToken(res.refresh_token);
      localStorage.setItem('medilens_user', JSON.stringify(res.user));
    }
    return res;
  },

  login: async (input: LoginInput): Promise<AuthResponse> => {
    const res = await apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: input,
      skipAuth: true,
    });
    if (res.token) {
      tokenStorage.setAccessToken(res.token);
      tokenStorage.setRefreshToken(res.refresh_token);
      localStorage.setItem('medilens_user', JSON.stringify(res.user));
    }
    return res;
  },

  logout: async (): Promise<void> => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await apiClient<void>('/auth/logout', {
          method: 'POST',
          body: { refresh_token: refreshToken },
        });
      }
    } finally {
      tokenStorage.clear();
      window.dispatchEvent(new CustomEvent('medilens:logout'));
    }
  },

  logoutAll: async (): Promise<void> => {
    try {
      await apiClient<void>('/auth/logout-all', { method: 'POST' });
    } finally {
      tokenStorage.clear();
      window.dispatchEvent(new CustomEvent('medilens:logout'));
    }
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient<User | { user: User }>('/auth/me');
    const user = 'user' in res ? res.user : res;
    localStorage.setItem('medilens_user', JSON.stringify(user));
    return user;
  },

  updateMe: async (input: MeUpdateInput): Promise<User> => {
    const res = await apiClient<User | { user: User }>('/auth/me', {
      method: 'PATCH',
      body: input,
    });
    const user = 'user' in res ? res.user : res;
    localStorage.setItem('medilens_user', JSON.stringify(user));
    return user;
  },

  deleteMe: async (password: string): Promise<void> => {
    await apiClient<void>('/auth/me', {
      method: 'DELETE',
      body: { password },
    });
    tokenStorage.clear();
    window.dispatchEvent(new CustomEvent('medilens:logout'));
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient<void>('/auth/password/forgot', {
      method: 'POST',
      body: { email },
      skipAuth: true,
    });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await apiClient<void>('/auth/password/reset', {
      method: 'POST',
      body: { token, newPassword },
      skipAuth: true,
    });
  },
};
