'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

/**
 * Hook untuk mengecek status akses Portal Labita:
 * Khusus dibuka jika pengguna sudah terautentikasi sebagai Administrator (Admin / Super Admin).
 */
export function usePortalAccess() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isLocalhost, setIsLocalhost] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      return (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host.endsWith('.local')
      );
    }
    return true;
  });

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const isLocal =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host.endsWith('.local');
      setIsLocalhost(isLocal);
    }
  }, []);

  // Status Under Development berlaku di domain online jika bukan localhost
  const isLabitaUnderDev = isClient && !isLocalhost;

  // Akses Portal Labita khusus untuk Administrator
  const canAccessLabita = !authLoading && Boolean(user && isAdmin);

  return {
    isClient,
    isLocalhost,
    isAdmin,
    user,
    authLoading,
    isLabitaUnderDev,
    canAccessLabita,
  };
}
