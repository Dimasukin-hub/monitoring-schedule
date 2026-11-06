'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import MonitorGorongGorongView from '@/components/MonitorGorongGorongView';
import FormOrderGorongGorongView from '@/components/FormOrderGorongGorongView';
import MasterStatusLokasiView from '@/components/MasterStatusLokasiView';
import MasterWaterloggingView from '@/components/MasterWaterloggingView';
import MasterSapUploadView from '@/components/MasterSapUploadView';
import UserManagementView from '@/components/UserManagementView';
import { useAuth } from '@/components/AuthProvider';
import {
  parseGorongGorongPathname,
  getGorongGorongRoute,
  GORONG_GORONG_ROUTES,
} from '@/lib/portalRoutes';

export default function GorongGorongPage() {
  const { user, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Inisialisasi awal berdasarkan URL saat ini
  const initial = parseGorongGorongPathname(pathname || '/gorong-gorong');
  const [activeTab, setActiveTab] = useState<string>(initial.activeTab);
  const [orderWilayahSubTab, setOrderWilayahSubTab] = useState<string>(initial.orderWilayahSubTab);
  const [masterDataSubTab, setMasterDataSubTab] = useState<string>(initial.masterDataSubTab);

  // Rekam portal aktif di sesi & sinkronisasi tab dari URL saat pertama kali load atau navigasi back/forward
  useEffect(() => {
    if (!pathname) return;
    const parsed = parseGorongGorongPathname(pathname);

    // Jika URL adalah rute induk (misal: /gorong-gorong atau /gorong-gorong/master-data), arahkan ke rute spesifiknya
    if (parsed.redirectTo && parsed.redirectTo !== pathname) {
      router.replace(parsed.redirectTo);
      return;
    }

    setActiveTab(parsed.activeTab);
    setOrderWilayahSubTab(parsed.orderWilayahSubTab);
    setMasterDataSubTab(parsed.masterDataSubTab);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ggf_active_portal', pathname);
    }
  }, [pathname, router]);

  // Dukung tombol Back / Forward browser tanpa reload
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const parsed = parseGorongGorongPathname(window.location.pathname);
        setActiveTab(parsed.activeTab);
        setOrderWilayahSubTab(parsed.orderWilayahSubTab);
        setMasterDataSubTab(parsed.masterDataSubTab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Guard tab master data & user management khusus Admin
  useEffect(() => {
    if (!isAdmin) {
      if (activeTab === 'master_data' || activeTab === 'user_management') {
        router.replace(GORONG_GORONG_ROUTES.monitor);
      }
    }
  }, [isAdmin, activeTab, router]);

  // Handler navigasi instan: ubah state langsung (0 ms jeda) dan perbarui URL di address bar
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const targetRoute = getGorongGorongRoute(
      newTab,
      newTab === 'master_data' ? masterDataSubTab : undefined
    );
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', targetRoute);
      sessionStorage.setItem('ggf_active_portal', targetRoute);
    }
  };

  const handleMasterDataSubTabChange = (newSubTab: string) => {
    setMasterDataSubTab(newSubTab);
    const targetRoute = getGorongGorongRoute('master_data', newSubTab);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', targetRoute);
      sessionStorage.setItem('ggf_active_portal', targetRoute);
    }
  };

  const handleOrderWilayahSubTabChange = (newSubTab: string) => {
    setOrderWilayahSubTab(newSubTab);
    const targetRoute = getGorongGorongRoute('form_input', newSubTab);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', targetRoute);
      sessionStorage.setItem('ggf_active_portal', targetRoute);
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'monitor_gorong_gorong':
        return 'Monitor Gorong-Gorong PG1';
      case 'form_input':
      case 'order_wilayah': {
        return 'Form Input • Order Gorong-Gorong';
      }
      case 'master_data': {
        const subTitles: Record<string, string> = {
          master_status_lokasi: 'Master Status Lokasi',
          master_waterlogging: 'Master Waterlogging',
          master_sap: 'Upload Realisasi SAP',
        };
        const sub = subTitles[masterDataSubTab];
        return sub ? `Master Data • ${sub}` : 'Master Data';
      }
      case 'user_management':
        return 'Manajemen User';
      default:
        return 'Portal Monitor Gorong-Gorong';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-500/30 selection:text-blue-700 dark:selection:text-blue-200 transition-colors duration-200">
      {/* Top Header dengan Branding Gorong-Gorong & Navigasi Tab */}
      <Header
        currentPortal="gorong_gorong"
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        orderWilayahSubTab={orderWilayahSubTab}
        setOrderWilayahSubTab={handleOrderWilayahSubTabChange}
        masterDataSubTab={masterDataSubTab}
        setMasterDataSubTab={handleMasterDataSubTabChange}
        activeTabTitle={getTabTitle()}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto max-w-[1700px] w-full mx-auto">
        {/* 1. MENU: MONITOR GORONG-GORONG (Ringkasan Saldo, Kebutuhan & Dropping 4 Diameter) */}
        <div className={activeTab === 'monitor_gorong_gorong' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
          <MonitorGorongGorongView />
        </div>

        {/* 2. MENU: FORM INPUT (Order Gorong-Gorong) */}
        <div className={(activeTab === 'form_input' || activeTab === 'order_wilayah') ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
          <FormOrderGorongGorongView />
        </div>

        {/* 3. MENU: MASTER DATA (Khusus Admin) */}
        {isAdmin && (
          <div className={activeTab === 'master_data' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
            {/* 3.1 SUB MENU: MASTER STATUS LOKASI */}
            <div className={masterDataSubTab === 'master_status_lokasi' ? 'block' : 'hidden'}>
              <MasterStatusLokasiView />
            </div>

            {/* 3.2 SUB MENU: MASTER WATERLOGGING */}
            <div className={masterDataSubTab === 'master_waterlogging' ? 'block' : 'hidden'}>
              <MasterWaterloggingView />
            </div>

            {/* 3.3 SUB MENU: UPLOAD DATA REALISASI SAP */}
            <div className={masterDataSubTab === 'master_sap' ? 'block' : 'hidden'}>
              <MasterSapUploadView />
            </div>
          </div>
        )}

        {/* 4. MENU: MANAJEMEN USER (Khusus Admin) */}
        {isAdmin && (
          <div className={activeTab === 'user_management' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
            <UserManagementView />
          </div>
        )}
      </main>
    </div>
  );
}
