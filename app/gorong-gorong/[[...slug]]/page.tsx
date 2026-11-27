'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import MonitorGorongGorongView from '@/components/MonitorGorongGorongView';
import ControlBoardGorongGorongView from '@/components/ControlBoardGorongGorongView';
import FormOrderGorongGorongView from '@/components/FormOrderGorongGorongView';
import MasterStatusLokasiView from '@/components/MasterStatusLokasiView';
import MasterWaterloggingView from '@/components/MasterWaterloggingView';
import MasterSapUploadView from '@/components/MasterSapUploadView';
import MasterOrderView from '@/components/MasterOrderView';
import MasterDropView from '@/components/MasterDropView';
import MasterDataPasangManualView from '@/components/MasterDataPasangManualView';
import MasterPindahView from '@/components/MasterPindahView';
import UserManagementView from '@/components/UserManagementView';
import { useAuth } from '@/components/AuthProvider';
import { getDefaultPortalRoute, hasMenuAccess, hasPortalAccess } from '@/lib/menuAccess';
import {
  parseGorongGorongPathname,
  getGorongGorongRoute,
  GORONG_GORONG_ROUTES,
} from '@/lib/portalRoutes';

export default function GorongGorongPage() {
  const { user, canAccessMonitor, canAccessControlBoard, canAccessMasterData, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const canEnterGorong = Boolean(user && hasPortalAccess(user, 'gorong_gorong'));
  const canFormInput = hasMenuAccess(user, 'gorong_gorong', 'form_input');
  const canUserManagement = hasMenuAccess(user, 'gorong_gorong', 'user_management');

  // Guard login: jika pengguna belum login, arahkan ke halaman login
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname || '/gorong-gorong')}`);
    }
  }, [authLoading, user, pathname, router]);

  // Inisialisasi awal berdasarkan URL saat ini
  const initial = parseGorongGorongPathname(pathname || '/gorong-gorong');
  const [activeTab, setActiveTab] = useState<string>(initial.activeTab);
  const [orderWilayahSubTab, setOrderWilayahSubTab] = useState<string>(initial.orderWilayahSubTab);
  const [masterDataSubTab, setMasterDataSubTab] = useState<string>(initial.masterDataSubTab);

  // Rekam portal aktif di sesi & sinkronisasi tab dari URL saat pertama kali load atau navigasi back/forward
  useEffect(() => {
    if (!pathname) return;
    const parsed = parseGorongGorongPathname(pathname);

    // Guard navigasi URL sesuai hak akses role / kustomisasi menu Super Admin
    if (!authLoading && user && canEnterGorong) {
      if (pathname === '/gorong-gorong' || !hasMenuAccess(user, 'gorong_gorong', parsed.activeTab)) {
        const fallback = getDefaultPortalRoute(user, 'gorong_gorong');
        if (fallback && fallback !== pathname) {
          const fallbackParsed = parseGorongGorongPathname(fallback);
          setActiveTab(fallbackParsed.activeTab);
          router.replace(fallback);
          return;
        }
      }
    }

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
  }, [pathname, router, authLoading, user, canEnterGorong]);

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

  // Guard tab sesuai role & kustomisasi menu pengguna
  useEffect(() => {
    if (!authLoading && user && canEnterGorong) {
      if (!hasMenuAccess(user, 'gorong_gorong', activeTab)) {
        const fallback = getDefaultPortalRoute(user, 'gorong_gorong');
        if (fallback && fallback !== pathname) {
          const fallbackParsed = parseGorongGorongPathname(fallback);
          setActiveTab(fallbackParsed.activeTab);
          router.replace(fallback);
        }
      }
    }
  }, [authLoading, user, canEnterGorong, activeTab, pathname, router]);

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
      case 'control_board':
        return 'Control Board • Summary & Verifikasi Harian';
      case 'form_input':
      case 'order_wilayah': {
        return 'Form Input • Order Gorong-Gorong';
      }
      case 'master_data': {
        const subTitles: Record<string, string> = {
          master_status_lokasi: 'Master Status Lokasi',
          master_waterlogging: 'Master Waterlogging',
          master_order: 'Master Data Order',
          master_drop: 'Master Data Drop',
          master_pasang_manual: 'Master Data Pasang Manual',
          master_pindah: 'Master Data Pindah Lokasi',
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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-500/30 selection:text-blue-700 dark:selection:text-blue-200 transition-colors duration-200 w-full max-w-full overflow-x-clip">
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

      {/* Main Content Area - Offset Mini Sidebar di Desktop */}
      <div className="flex-1 md:pl-16 flex flex-col w-full min-w-0">
      <main className="flex-1 p-2 sm:p-4 md:p-5 pb-20 sm:pb-8 space-y-4 sm:space-y-6 w-full max-w-full overflow-x-clip">
        {!authLoading && user && !canEnterGorong ? (
          <div className="max-w-lg mx-auto mt-16 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Akses Menu Tidak Tersedia
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tidak ada menu yang diizinkan untuk akun Anda pada Portal Gorong-Gorong. Silakan hubungi Super Admin.
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Kembali ke Portal Utama
            </button>
          </div>
        ) : (
          <>
            {/* 1. MENU: MONITOR GORONG-GORONG (Ringkasan Saldo, Kebutuhan & Dropping 4 Diameter) */}
            {canAccessMonitor && (
              <div className={activeTab === 'monitor_gorong_gorong' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
                <MonitorGorongGorongView />
              </div>
            )}

            {/* 1.5. MENU: CONTROL BOARD */}
            {canAccessControlBoard && (
              <div className={activeTab === 'control_board' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
                <ControlBoardGorongGorongView />
              </div>
            )}

            {/* 2. MENU: FORM INPUT (Order Gorong-Gorong) */}
            {canFormInput && (
              <div className={(activeTab === 'form_input' || activeTab === 'order_wilayah') ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
                <FormOrderGorongGorongView />
              </div>
            )}

            {/* 3. MENU: MASTER DATA */}
            {canAccessMasterData && (
              <div className={activeTab === 'master_data' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
                {/* 3.1 SUB MENU: MASTER STATUS LOKASI */}
                <div className={masterDataSubTab === 'master_status_lokasi' ? 'block' : 'hidden'}>
                  <MasterStatusLokasiView />
                </div>

                {/* 3.2 SUB MENU: MASTER WATERLOGGING */}
                <div className={masterDataSubTab === 'master_waterlogging' ? 'block' : 'hidden'}>
                  <MasterWaterloggingView />
                </div>

                {/* 3.3 SUB MENU: MASTER DATA ORDER */}
                <div className={masterDataSubTab === 'master_order' ? 'block' : 'hidden'}>
                  <MasterOrderView />
                </div>

                {/* 3.4 SUB MENU: MASTER DATA DROP */}
                <div className={masterDataSubTab === 'master_drop' ? 'block' : 'hidden'}>
                  <MasterDropView />
                </div>

                {/* 3.5 SUB MENU: MASTER DATA PASANG MANUAL */}
                <div className={masterDataSubTab === 'master_pasang_manual' ? 'block' : 'hidden'}>
                  <MasterDataPasangManualView />
                </div>

                {/* 3.6 SUB MENU: MASTER DATA PINDAH LOKASI */}
                <div className={masterDataSubTab === 'master_pindah' ? 'block' : 'hidden'}>
                  <MasterPindahView />
                </div>

                {/* 3.6 SUB MENU: UPLOAD DATA REALISASI SAP */}
                <div className={masterDataSubTab === 'master_sap' ? 'block' : 'hidden'}>
                  <MasterSapUploadView />
                </div>
              </div>
            )}

            {/* 4. MENU: MANAJEMEN USER */}
            {canUserManagement && (
              <div className={activeTab === 'user_management' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
                <UserManagementView portal="gorong-gorong" />
              </div>
            )}
          </>
        )}
      </main>
      </div>
    </div>
  );
}
