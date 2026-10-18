import axios from 'axios';

const rawBaseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://final-project-backend-5htz.onrender.com' : undefined);
const baseURL = rawBaseURL
  ? (rawBaseURL.endsWith('/api') ? rawBaseURL : `${rawBaseURL.replace(/\/+$/, '')}/api`)
  : '/api';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization token automatically on every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Normalize error responses and handle expired / invalid tokens
apiClient.interceptors.response.use(
  (response) => {
    // If an SPA host (like Cloudflare Pages) returns index.html for a missing API route
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
  (error) => {
    const status = error.response?.status;
    const errorData = error.response?.data;
    const message =
      errorData?.error ||
      errorData?.message ||
      error.message ||
      'An unexpected error occurred.';

    // If unauthorized / token expired, purge stale token from storage
    if (status === 401) {
      const isAuthError =
        errorData?.expired ||
        message.toLowerCase().includes('token') ||
        message.toLowerCase().includes('session') ||
        message.toLowerCase().includes('unauthorized') ||
        message.toLowerCase().includes('access denied');

      if (isAuthError) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(
          new CustomEvent('auth:expired', {
            detail: { message: message || 'Your session has expired. Please sign in again.' },
          })
        );
      }
    }

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
