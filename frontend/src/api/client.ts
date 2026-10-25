/**
 * MediLens AI — HTTP Client & Token Handler
 * Implements typed requests, flat error envelope parsing, and automatic single-token refresh.
 */

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const tokenStorage = {
  getAccessToken: (): string | null => localStorage.getItem('medilens_token'),
  setAccessToken: (token: string): void => localStorage.setItem('medilens_token', token),
  getRefreshToken: (): string | null => localStorage.getItem('medilens_refresh_token'),
  setRefreshToken: (token: string): void => localStorage.setItem('medilens_refresh_token', token),
  clear: (): void => {
    localStorage.removeItem('medilens_token');
    localStorage.removeItem('medilens_refresh_token');
    localStorage.removeItem('medilens_user');
  },
};

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string | null) => void) {
  refreshSubscribers.push(callback);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    tokenStorage.clear();
    return null;
  }

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      tokenStorage.clear();
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.token || data.access_token;
    const newRefreshToken = data.refresh_token;

    if (newAccessToken) {
      tokenStorage.setAccessToken(newAccessToken);
      if (newRefreshToken) {
        tokenStorage.setRefreshToken(newRefreshToken);
      }
      return newAccessToken;
    }
    return null;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, skipAuth, headers: customHeaders, body, ...restOptions } = options;

  let url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.append(k, String(v));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const headers = new Headers(customHeaders);

  if (!skipAuth) {
    const token = tokenStorage.getAccessToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const isFormData = body instanceof FormData;
  if (!isFormData && body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const payload = isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined;

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      headers,
      body: payload,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiError(msg, 'NETWORK_ERROR', 0);
  }

  // Handle 401 Unauthorized with single-token refresh
  if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/signup')) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      onRefreshed(newToken);

      if (!newToken) {
        window.dispatchEvent(new CustomEvent('medilens:logout'));
        throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401);
      }
    } else {
      // Wait for ongoing refresh
      const retryToken = await new Promise<string | null>((resolve) => {
        addRefreshSubscriber(resolve);
      });
      if (!retryToken) {
        throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401);
      }
    }

    // Retry original request with new token
    const retryHeaders = new Headers(headers);
    const retryToken = tokenStorage.getAccessToken();
    if (retryToken) {
      retryHeaders.set('Authorization', `Bearer ${retryToken}`);
    }

    response = await fetch(url, {
      ...restOptions,
      headers: retryHeaders,
      body: payload,
    });
  }

  if (response.status === 204) {
    return {} as T;
  }

  let data: any;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage =
      (typeof data === 'object' && data && (data.error || data.message)) ||
      (typeof data === 'string' && data) ||
      response.statusText ||
      'An unexpected error occurred';
    const errorCode = (typeof data === 'object' && data && data.code) || `HTTP_${response.status}`;
    const errorDetails = typeof data === 'object' && data ? data.details : undefined;

    throw new ApiError(String(errorMessage), String(errorCode), response.status, errorDetails);
  }

  return data as T;
}
