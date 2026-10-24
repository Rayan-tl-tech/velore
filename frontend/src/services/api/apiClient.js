import axios from 'axios';

const rawBaseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://final-project-backend-5htz.onrender.com' : undefined);
const baseURL = rawBaseURL
  ? (rawBaseURL.endsWith('/api') ? rawBaseURL : `${rawBaseURL.replace(/\/+$/, '')}/api`)
  : '/api';

// In-memory access token storage (Phase 3: NO JWT IN LOCALSTORAGE)
let inMemoryAccessToken = null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token && typeof token === 'string' && token !== 'null' && token !== 'undefined'
    ? token
    : null;
};

export const getAccessToken = () => inMemoryAccessToken;

const apiClient = axios.create({
  baseURL,
  withCredentials: true, // Send HttpOnly refresh token cookies automatically
  headers: {
    'Content-Type': 'application/json',
    'x-velor-client': 'true', // CSRF defense custom verification header
  },
});

// Attach in-memory access token automatically on every request
apiClient.interceptors.request.use(
  (config) => {
    if (inMemoryAccessToken) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Concurrency queue for token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: automatically handles 401 token expiration via silent refresh
apiClient.interceptors.response.use(
  (response) => {
    // If an SPA host returns HTML for a missing API route
    if (
      typeof response.data === 'string' &&
      (response.data.trim().startsWith('<!DOCTYPE html') || response.data.trim().startsWith('<html'))
    ) {
      return Promise.reject(
        new Error('API returned HTML instead of data. Make sure backend VITE_API_URL is configured.')
      );
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const errorData = error.response?.data;
    const message =
      errorData?.error ||
      errorData?.message ||
      error.message ||
      'An unexpected error occurred.';

    // Do NOT attempt refresh on login or refresh endpoints to avoid infinite loops
    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/register');

    if (status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        // Queue concurrent requests while a refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint with credentials (sends HttpOnly cookie)
        const refreshResponse = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              'x-velor-client': 'true',
            },
          }
        );

        const newAccessToken =
          refreshResponse.data?.accessToken || refreshResponse.data?.token;

        if (!newAccessToken) {
          throw new Error('No access token returned from refresh');
        }

        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        // Notify AuthContext with the refreshed token and user
        window.dispatchEvent(
          new CustomEvent('auth:token_refreshed', {
            detail: {
              token: newAccessToken,
              user: refreshResponse.data?.user,
            },
          })
        );

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        setAccessToken(null);

        // Emit expired event to notify AuthContext to clear memory
        window.dispatchEvent(
          new CustomEvent('auth:expired', {
            detail: { message: 'Your session has expired. Please sign in again.' },
          })
        );

        return Promise.reject(new Error('Session expired. Please sign in again.'));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
