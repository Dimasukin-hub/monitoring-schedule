'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

/**
 * Hook untuk mengecek status akses Portal Labita:
 * 1. Di lingkungan localhost / 127.0.0.1 -> Selalu diizinkan (Development Mode).
 * 2. Di server online / domain publik -> Dibatasi khusus untuk Administrator (Under Development).
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

  // Akses dibuka jika di localhost ATAU jika sudah login sebagai Admin
  const canAccessLabita = isLocalhost || (!authLoading && isAdmin);

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
