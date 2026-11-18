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
  const { user, isAdmin, isSuperAdmin, isUserPlanting, isUserWilayah, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Guard login khusus Super Admin
  useEffect(() => {
    if (!authLoading && (!user || !isSuperAdmin)) {
      router.replace(
        `/login?role=super_admin&callbackUrl=${encodeURIComponent(
          pathname || SULAM_ROUTES.monitor
        )}`
      );
    }
  }, [authLoading, user, isSuperAdmin, pathname, router]);

  // Inisialisasi awal berdasarkan URL saat ini
  const initial = parseSulamPathname(pathname || '/sulam');
  const [activeTab, setActiveTab] = useState<string>(initial.activeTab);
  const [masterDataSubTab, setMasterDataSubTab] = useState<string>(initial.masterDataSubTab);

  // Rekam portal aktif di sesi & sinkronisasi tab dari URL
  useEffect(() => {
    if (!pathname) return;
    const parsed = parseSulamPathname(pathname);

    // Jika User Wilayah mencoba membuka monitor atau master data, arahkan ke form order
    if (!authLoading && user && !isAdmin && !isUserPlanting && isUserWilayah) {
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

    if (parsed.redirectTo && parsed.redirectTo !== pathname) {
      router.replace(parsed.redirectTo);
      return;
    }

    setActiveTab(parsed.activeTab);
    setMasterDataSubTab(parsed.masterDataSubTab);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ggf_active_portal', pathname);
    }
  }, [pathname, router, authLoading, user, isAdmin, isUserPlanting, isUserWilayah]);

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

  // Tampilan loading / pemeriksaan hak akses sebelum diarahkan ke login super admin
  if (authLoading || !user || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Memeriksa hak akses Super Administrator...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Header Utama Portal Sulam */}
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        currentPortal="sulam"
        masterDataSubTab={masterDataSubTab}
        onMasterDataSubTabChange={handleMasterDataSubTabChange}
      />

      {/* Main Body Content - Keep-Alive DOM Preservation (0 ms Tanpa Loading Jeda) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={activeTab === 'monitor_sulam' ? 'space-y-6 animate-in fade-in duration-150' : 'hidden'}>
          <MonitorSulamView />
        </div>
        <div className={(activeTab === 'form_order_sulam' || activeTab === 'form_input') ? 'space-y-6 animate-in fade-in duration-150' : 'hidden'}>
          <FormOrderSulamView />
        </div>
        <div className={(activeTab === 'master_data' || activeTab === 'master_data_sulam') ? 'space-y-6 animate-in fade-in duration-150' : 'hidden'}>
          <div className={masterDataSubTab === 'master_status_lokasi' ? 'block' : 'hidden'}>
            <MasterStatusLokasiView />
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

