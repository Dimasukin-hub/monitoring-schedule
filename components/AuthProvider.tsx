'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  role: 'admin' | 'user' | null;
  isAdmin: boolean;
  isUser: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, role: 'admin' | 'user') => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  setUserDirectly: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isAdmin: false,
  isUser: false,
  isLoading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  setUserDirectly: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Load user session from localStorage & cookie API
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ggf_auth_user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to parse stored auth user');
    }

    // Verify with server API
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('ggf_auth_user', JSON.stringify(data.user));
        }
      })
      .catch((err) => console.warn('Auth check warning:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('ggf_auth_user', JSON.stringify(data.user));
        return { success: true };
      }
      return { success: false, message: data.message || 'Login gagal.' };
    } catch (err: any) {
      return { success: false, message: 'Koneksi ke server gagal.' };
    }
  };

  const register = async (name: string, email: string, password: string, role: 'admin' | 'user') => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('ggf_auth_user', JSON.stringify(data.user));
        return { success: true };
      }
      return { success: false, message: data.message || 'Registrasi gagal.' };
    } catch (err: any) {
      return { success: false, message: 'Koneksi ke server gagal.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/me', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    setUser(null);
    localStorage.removeItem('ggf_auth_user');
    router.push('/');
  };

  const setUserDirectly = (u: AuthUser | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem('ggf_auth_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('ggf_auth_user');
    }
  };

  const role = user?.role || null;
  const isAdmin = role === 'admin';
  const isUser = role === 'user';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isUser,
        isLoading,
        login,
        register,
        logout,
        setUserDirectly,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
