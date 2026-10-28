import { createContext, useContext, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  async function refreshUser() {
    try {
      const { user: freshUser } = await api.getMe();
      setUser(freshUser);
      return freshUser;
    } catch {
      setUser(null);
      return null;
    }
  }

  async function login(email, password) {
    const data = await api.login({ email, password });
    setUser(data.user);
    return data;
  }

  async function register(payload) {
    return api.register(payload);
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}