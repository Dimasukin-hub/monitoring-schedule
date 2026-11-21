'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'kepala_bagian_fe'
  | 'manajer_fe'
  | 'manajer_fm'
  | 'manajer_osd'
  | 'kepala_wilayah'
  | 'user_fe'
  | 'user_wilayah'
  | 'user'
  | 'user_planting';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  username?: string;
  role: UserRole;
  wilayah?: string | null;
  avatar?: string | null;
}

export function getRoleDisplayName(role: UserRole | string | null | undefined): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin FE';
    case 'kepala_bagian_fe':
      return 'Kepala Bagian FE';
    case 'manajer_fe':
      return 'Manajer FE';
    case 'manajer_fm':
      return 'Manajer FM';
    case 'manajer_osd':
      return 'Manajer OSD';
    case 'kepala_wilayah':
      return 'Kepala Wilayah';
    case 'user_fe':
      return 'TK Verifikator FE';
    case 'user_wilayah':
    case 'user':
      return 'Mandor Wilayah';
    case 'user_planting':
      return 'User Planting';
    default:
      return role ? String(role) : 'User';
  }
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  roleDisplayName: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isAdminFE: boolean;
  isManagement: boolean;
  isKepalaWilayah: boolean;
  isTKVerifikatorFE: boolean;
  isMandorWilayah: boolean;
  isUser: boolean;
  isUserFE: boolean;
  isUserWilayah: boolean;
  isUserPlanting: boolean;
  canAccessMonitor: boolean;
  canAccessControlBoard: boolean;
  canAccessMasterData: boolean;
  canEditOpenCloseStatus: boolean;
  canUploadMasterData: boolean;
  isFormInputViewOnly: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  setUserDirectly: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  roleDisplayName: '',
  isSuperAdmin: false,
  isAdmin: false,
  isAdminFE: false,
  isManagement: false,
  isKepalaWilayah: false,
  isTKVerifikatorFE: false,
  isMandorWilayah: false,
  isUser: false,
  isUserFE: false,
  isUserWilayah: false,
  isUserPlanting: false,
  canAccessMonitor: false,
  canAccessControlBoard: false,
  canAccessMasterData: false,
  canEditOpenCloseStatus: false,
  canUploadMasterData: false,
  isFormInputViewOnly: false,
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

  const register = async (name: string, email: string, password: string, role: UserRole) => {
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
  const roleDisplayName = getRoleDisplayName(role);
  const isSuperAdmin = role === 'super_admin';
  const isAdminFE = role === 'admin';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isManagement = ['kepala_bagian_fe', 'manajer_fe', 'manajer_fm', 'manajer_osd'].includes(role || '');
  const isKepalaWilayah = role === 'kepala_wilayah';
  const isTKVerifikatorFE = role === 'user_fe';
  const isMandorWilayah = role === 'user_wilayah' || role === 'user';
  const isUserFE = isTKVerifikatorFE;
  const isUserWilayah = isMandorWilayah;
  const isUserPlanting = role === 'user_planting';
  const isUser = !isAdmin && !isManagement && !isKepalaWilayah;

  const canAccessMonitor = isSuperAdmin || isAdmin || isManagement || isKepalaWilayah;
  // Hak akses menu Control Board: Khusus 6 role (Super Admin, Admin FE, Kabag FE, Manajer FE, Manajer FM, Manajer OSD)
  const canAccessControlBoard = Boolean(
    user && (
      role === 'super_admin' ||
      role === 'admin' ||
      role === 'kepala_bagian_fe' ||
      role === 'manajer_fe' ||
      role === 'manajer_fm' ||
      role === 'manajer_osd'
    )
  );
  const canAccessMasterData = isSuperAdmin || isAdmin || isManagement || isKepalaWilayah;
  const canEditOpenCloseStatus = isSuperAdmin || isAdmin;
  const canUploadMasterData = isSuperAdmin || isAdmin;
  const isFormInputViewOnly = isManagement;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        roleDisplayName,
        isSuperAdmin,
        isAdmin,
        isAdminFE,
        isManagement,
        isKepalaWilayah,
        isTKVerifikatorFE,
        isMandorWilayah,
        isUser,
        isUserFE,
        isUserWilayah,
        isUserPlanting,
        canAccessMonitor,
        canAccessControlBoard,
        canAccessMasterData,
        canEditOpenCloseStatus,
        canUploadMasterData,
        isFormInputViewOnly,
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
