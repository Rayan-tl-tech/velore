import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  login as loginApi,
  register as registerApi,
  refreshToken as refreshApi,
  logout as logoutApi,
} from '../services/api/authService';
import { setAccessToken } from '../services/api/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session via silent HttpOnly refresh on initial app mount
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const data = await refreshApi();
        if (mounted && data) {
          const freshToken = data.accessToken || data.token;
          setToken(freshToken);
          setAccessToken(freshToken);
          setUser(data.user || null);
        }
      } catch {
        if (mounted) {
          setToken(null);
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Listen for background token updates from the Axios 401 interceptor
  useEffect(() => {
    const handleTokenRefreshed = (e) => {
      const newToken = e.detail?.token;
      const newUser = e.detail?.user;
      if (newToken) {
        setToken(newToken);
        setAccessToken(newToken);
      }
      if (newUser) {
        setUser(newUser);
      }
    };

    const handleAuthExpired = () => {
      setToken(null);
      setAccessToken(null);
      setUser(null);
    };

    window.addEventListener('auth:token_refreshed', handleTokenRefreshed);
    window.addEventListener('auth:expired', handleAuthExpired);

    return () => {
      window.removeEventListener('auth:token_refreshed', handleTokenRefreshed);
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await loginApi(email, password);
    const newToken = data.accessToken || data.token;
    const userInfo = data.user || data;

    // Store in-memory only (NO LOCALSTORAGE)
    setToken(newToken);
    setAccessToken(newToken);
    setUser(userInfo);

    return userInfo;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await registerApi(name, email, password);
    const newToken = data.accessToken || data.token;
    const userInfo = data.user || data;

    // Store in-memory only
    if (newToken) {
      setToken(newToken);
      setAccessToken(newToken);
      setUser(userInfo);
    }

    return userInfo;
  }, []);

  const updateUser = useCallback((newUserData) => {
    setUser((prev) => (prev ? { ...prev, ...newUserData } : prev));
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      // Clear in-memory token and state
      setToken(null);
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const isAdmin = (user?.roles?.includes('admin') || user?.role === 'admin') ?? false;
  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
