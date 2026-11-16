'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import MonitorSulamView from '@/components/sulam/MonitorSulamView';
import FormOrderSulamView from '@/components/sulam/FormOrderSulamView';
import MasterStatusLokasiView from '@/components/MasterStatusLokasiView';
import MasterOrderSulamView from '@/components/sulam/MasterOrderSulamView';
import MasterDropBibitSulamView from '@/components/sulam/MasterDropBibitSulamView';
import MasterRealSulamView from '@/components/sulam/MasterRealSulamView';
import MasterListSulamView from '@/components/sulam/MasterListSulamView';
import UserManagementView from '@/components/UserManagementView';
import { useAuth } from '@/components/AuthProvider';
import {
  parseSulamPathname,
  getSulamRoute,
  SULAM_ROUTES,
} from '@/lib/portalRoutes';

export default function SulamPage() {
  const { user, isAdmin, isUserPlanting, isUserWilayah, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Guard login
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname || '/sulam')}`);
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

  // Handler navigasi
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const targetRoute = getSulamRoute(
      newTab,
      newTab === 'master_data' || newTab === 'master_data_sulam' ? masterDataSubTab : undefined
    );
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ggf_active_portal', targetRoute);
    }
    router.push(targetRoute, { scroll: false });
  };

  const handleMasterDataSubTabChange = (newSubTab: string) => {
    setMasterDataSubTab(newSubTab);
    const targetRoute = getSulamRoute('master_data', newSubTab);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ggf_active_portal', targetRoute);
    }
    router.push(targetRoute, { scroll: false });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'monitor_sulam':
        return <MonitorSulamView />;
      case 'form_order_sulam':
      case 'form_input':
        return <FormOrderSulamView />;
      case 'master_data':
      case 'master_data_sulam':
        switch (masterDataSubTab) {
          case 'master_status_lokasi':
            return <MasterStatusLokasiView />;
          case 'master_order':
            return <MasterOrderSulamView />;
          case 'master_drop':
            return <MasterDropBibitSulamView />;
          case 'master_real':
            return <MasterRealSulamView />;
          case 'master_list_sulam':
            return <MasterListSulamView />;
          default:
            return <MasterStatusLokasiView />;
        }
      case 'user_management':
        return <UserManagementView />;
      default:
        return <MonitorSulamView />;
    }
  };

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

      {/* Main Body Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderContent()}
      </main>
    </div>
  );
}

