// src/context/AuthContext.jsx
// ✅ Correct field mapping for your Django LoginView + RegisterSerializer

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { login, register, getProfile } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [ready, setReady]     = useState(false); // true once initial auth check done

  // ── Restore session on mount ──────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setReady(true); return; }
    getProfile()
      .then(r => setUser(r.data))
      .catch(() => {
        // Token invalid / expired — clear it
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      })
      .finally(() => setReady(true));
  }, []);

  // ── Login ─────────────────────────────────────────────────
  // Django LoginView expects: { email, password }
  const loginUser = useCallback(async (email, password) => {
    const { data } = await login({ email, password });
    localStorage.setItem('access_token',  data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
    setUser(data.user);
    return data.user;
  }, []);

  // ── Register ──────────────────────────────────────────────
  // Django RegisterSerializer expects:
  // { first_name, last_name, username, email, password, password2, phone? }
  const registerUser = useCallback(async (formData) => {
    const { data } = await register(formData);
    localStorage.setItem('access_token',  data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
    setUser(data.user);
    return data.user;
  }, []);

  // ── Logout ────────────────────────────────────────────────
  const logoutUser = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  }, []);

  // ── Update local user state (e.g. after profile edit) ─────
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await getProfile();
      setUser(data);
      return data;
    } catch {
      logoutUser();
    }
  }, [logoutUser]);

  const value = {
    user,
    ready,
    isAuthenticated: !!user,
    loginUser,
    registerUser,
    logoutUser,
    refreshUser,
  };

  // Don't render children until we know if the user is logged in
  if (!ready) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-body)',
      }}>
        <div className="spinner" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};