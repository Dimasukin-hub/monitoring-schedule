'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import MonitorSulamView from '@/components/sulam/MonitorSulamView';
import FormOrderSulamView from '@/components/sulam/FormOrderSulamView';
import MasterStatusLokasiView from '@/components/MasterStatusLokasiView';
import MasterOrderSulamView from '@/components/sulam/MasterOrderSulamView';
import MasterDropBibitSulamView from '@/components/sulam/MasterDropBibitSulamView';
import MasterRealSulamView from '@/components/sulam/MasterRealSulamView';
import MasterSpekBibitSulamView from '@/components/sulam/MasterSpekBibitSulamView';
import UserManagementView from '@/components/UserManagementView';
import { useAuth } from '@/components/AuthProvider';
import {
  parseSulamPathname,
  getSulamRoute,
  SULAM_ROUTES,
} from '@/lib/portalRoutes';

export default function SulamPage() {
  const { user, isAdmin, isSuperAdmin, isUserPlanting, isUserWilayah, isKepalaWilayah, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Guard login
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(
        `/login?callbackUrl=${encodeURIComponent(
          pathname || SULAM_ROUTES.formOrder
        )}`
      );
    }
  }, [authLoading, user, pathname, router]);

  // Inisialisasi awal berdasarkan URL saat ini
  const initial = parseSulamPathname(pathname || '/sulam');
  const [activeTab, setActiveTab] = useState<string>(initial.activeTab);
  const [masterDataSubTab, setMasterDataSubTab] = useState<string>(initial.masterDataSubTab);

  // Rekam portal aktif di sesi & sinkronisasi tab dari URL
  useEffect(() => {
    if (!pathname) return;
    const parsed = parseSulamPathname(pathname);

    // 1. Jika User Wilayah (Mandor): hanya boleh akses form order sulam
    if (!authLoading && user && !isAdmin && !isSuperAdmin && !isUserPlanting && !isKepalaWilayah && isUserWilayah) {
      if (
        pathname === '/sulam' ||
        pathname === SULAM_ROUTES.monitor ||
        parsed.activeTab === 'monitor_sulam' ||
        parsed.activeTab === 'master_data' ||
        parsed.activeTab === 'user_management'
      ) {
        setActiveTab('form_order_sulam');
        router.replace(SULAM_ROUTES.formOrder);
        return;
      }
    }

    // 2. Jika User Planting: default ke form order sulam jika membuka root /sulam
    if (!authLoading && user && isUserPlanting && !isAdmin && !isSuperAdmin) {
      if (pathname === '/sulam' || parsed.activeTab === 'user_management') {
        setActiveTab('form_order_sulam');
        router.replace(SULAM_ROUTES.formOrder);
        return;
      }
    }

    // 3. Jika Kepala Wilayah: dapat akses semua menu sulam kecuali manajemen user
    if (!authLoading && user && isKepalaWilayah) {
      if (parsed.activeTab === 'user_management') {
        setActiveTab('monitor_sulam');
        router.replace(SULAM_ROUTES.monitor);
        return;
      }
    }

    if (parsed.redirectTo && parsed.redirectTo !== pathname) {
      router.replace(parsed.redirectTo);
      return;
    }

    setActiveTab(parsed.activeTab);
    setMasterDataSubTab(parsed.masterDataSubTab);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ggf_active_portal', pathname);
    }
  }, [pathname, router, authLoading, user, isAdmin, isSuperAdmin, isUserPlanting, isUserWilayah, isKepalaWilayah]);

  // Dukung tombol Back / Forward browser tanpa reload
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const parsed = parseSulamPathname(window.location.pathname);
        setActiveTab(parsed.activeTab);
        setMasterDataSubTab(parsed.masterDataSubTab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handler navigasi instan: ubah state langsung (0 ms jeda) dan perbarui URL di address bar
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const targetRoute = getSulamRoute(
      newTab,
      newTab === 'master_data' || newTab === 'master_data_sulam' ? masterDataSubTab : undefined
    );
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', targetRoute);
      sessionStorage.setItem('ggf_active_portal', targetRoute);
    }
  };

  const handleMasterDataSubTabChange = (newSubTab: string) => {
    setMasterDataSubTab(newSubTab);
    const targetRoute = getSulamRoute('master_data', newSubTab);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', targetRoute);
      sessionStorage.setItem('ggf_active_portal', targetRoute);
    }
  };

  // Tampilan loading / pemeriksaan hak akses
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Memeriksa hak akses pengguna...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 w-full max-w-full overflow-x-hidden">
      {/* Header Utama Portal Sulam */}
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        currentPortal="sulam"
        masterDataSubTab={masterDataSubTab}
        onMasterDataSubTabChange={handleMasterDataSubTabChange}
      />

      {/* Main Body Content - Full Width Margin Rapi Sampai Samping */}
      <main className="flex-1 p-2 sm:p-4 md:p-5 pb-20 sm:pb-8 space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
        <div className={activeTab === 'monitor_sulam' ? 'space-y-6 animate-in fade-in duration-150' : 'hidden'}>
          <MonitorSulamView />
        </div>
        <div className={(activeTab === 'form_order_sulam' || activeTab === 'form_input') ? 'space-y-6 animate-in fade-in duration-150' : 'hidden'}>
          <FormOrderSulamView />
        </div>
        <div className={(activeTab === 'master_data' || activeTab === 'master_data_sulam') ? 'space-y-6 animate-in fade-in duration-150' : 'hidden'}>
          <div className={masterDataSubTab === 'master_status_lokasi' ? 'block' : 'hidden'}>
            <MasterStatusLokasiView hideUploadAndTemplate={true} portal="sulam" />
          </div>
          <div className={masterDataSubTab === 'master_order' ? 'block' : 'hidden'}>
            <MasterOrderSulamView />
          </div>
          <div className={masterDataSubTab === 'master_drop' ? 'block' : 'hidden'}>
            <MasterDropBibitSulamView />
          </div>
          <div className={masterDataSubTab === 'master_real' ? 'block' : 'hidden'}>
            <MasterRealSulamView />
          </div>
          <div className={masterDataSubTab === 'master_spek' ? 'block' : 'hidden'}>
            <MasterSpekBibitSulamView />
          </div>
        </div>
        {isAdmin && (
          <div className={activeTab === 'user_management' ? 'space-y-6 animate-in fade-in duration-150' : 'hidden'}>
            <UserManagementView />
          </div>
        )}
      </main>
    </div>
  );
}

