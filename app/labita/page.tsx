'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Lock,
  ShieldCheck,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import Header from '@/components/Header';
import KpiCards from '@/components/KpiCards';
import {
  RencanaRealisasiSection,
  ProsesTanamSection,
} from '@/components/ChartsSection';
import LandTable from '@/components/LandTable';
import ListStokLahanView from '@/components/ListStokLahanView';
import LandDetailModal from '@/components/LandDetailModal';
import LandEditModal from '@/components/LandEditModal';
import RerataBeroSection from '@/components/RerataBeroSection';
import PlantingView from '@/components/PlantingView';
import TanamBenchmarkChart from '@/components/TanamBenchmarkChart';
import RealTanamKemarinTable from '@/components/RealTanamKemarinTable';
import RealTanamBibitDonutChart from '@/components/RealTanamBibitDonutChart';
import SebaranBibitBulanChart from '@/components/SebaranBibitBulanChart';
import ListLokasiSelesaiTanamTable from '@/components/ListLokasiSelesaiTanamTable';
import ListLokasiProsesTanamTable from '@/components/ListLokasiProsesTanamTable';
import QuickUpdateTanamView from '@/components/QuickUpdateTanamView';
import InputRealTanamPetikView from '@/components/InputRealTanamPetikView';
import UserManagementView from '@/components/UserManagementView';
import { useAuth } from '@/components/AuthProvider';
import { usePortalAccess } from '@/lib/portalAccess';

export default function LabitaDashboardPage() {
  const { user, isAdmin } = useAuth();
  const { isLocalhost, canAccessLabita, isClient, authLoading } = usePortalAccess();

  const [activeTab, setActiveTab] = useState<string>('executive_summary');
  const [executiveSubTab, setExecutiveSubTab] = useState<string>('pengolahan_lahan');
  const [pengolahanSubTab, setPengolahanSubTab] = useState<string>('list_stok_lahan');
  const [plantingSubTab, setPlantingSubTab] = useState<string>('real_tanam_nanas');
  const [selectedWilayah, setSelectedWilayah] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('LATEST');
  const [stokYear, setStokYear] = useState<number>(2026);
  const [stokMonth, setStokMonth] = useState<string>('CURRENT');
  const [searchQuery, setSearchQuery] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('labita_table_search') || '';
    }
    return '';
  });
  const [plantingSearchQuery, setPlantingSearchQuery] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('labita_planting_search') || '';
    }
    return '';
  });
  const [selectedLandId, setSelectedLandId] = useState<number | string | null>(null);
  const [editingLandId, setEditingLandId] = useState<number | string | null>(null);
  const [refreshLandTrigger, setRefreshLandTrigger] = useState<number>(0);

  const [summaryData, setSummaryData] = useState<any>(null);
  const [chartsData, setChartsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load Dashboard Summary & Charts
  const loadDashboardData = (isManualRefresh = false, isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true);
    }
    const summaryParams = new URLSearchParams();
    if (selectedWilayah && selectedWilayah !== 'ALL') {
      summaryParams.set('wilayah', selectedWilayah);
    }
    if (selectedPeriod && selectedPeriod !== 'LATEST') {
      summaryParams.set('periode', selectedPeriod);
    }
    if (stokYear) {
      summaryParams.set('year', String(stokYear));
    }
    if (stokMonth) {
      summaryParams.set('month', stokMonth);
    }

    const chartsParams = new URLSearchParams();
    if (selectedWilayah && selectedWilayah !== 'ALL') {
      chartsParams.set('wilayah', selectedWilayah);
    }
    if (stokYear) {
      chartsParams.set('year', String(stokYear));
    }
    if (stokMonth) {
      chartsParams.set('month', stokMonth);
    }

    Promise.all([
      fetch(`/api/dashboard/summary?${summaryParams.toString()}`).then((res) => res.json()),
      fetch(`/api/dashboard/charts?${chartsParams.toString()}`).then((res) => res.json()),
    ])
      .then(([summaryRes, chartsRes]) => {
        if (summaryRes.success) setSummaryData(summaryRes.data);
        if (chartsRes.success) setChartsData(chartsRes.data);
      })
      .catch((err) => console.error('Error fetching dashboard data:', err))
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ggf_active_portal', '/labita');
    }
  }, []);

  const handleRefresh = () => {
    setRefreshLandTrigger((prev) => prev + 1);
    loadDashboardData(true);
  };

  const handleSilentDataChanged = () => {
    // Perbarui kartu dashboard & grafik bero di latar belakang tanpa reload tabel dan tanpa jeda loading
    setRefreshLandTrigger((prev) => prev + 1);
    loadDashboardData(false, true);
  };

  useEffect(() => {
    if (!canAccessLabita) return;
    loadDashboardData();
  }, [canAccessLabita, selectedWilayah, selectedPeriod, stokYear, stokMonth]);

  useEffect(() => {
    if (!isAdmin) {
      if (activeTab === 'user_management') {
        setActiveTab('executive_summary');
      }
      if (activeTab === 'planting' && plantingSubTab === 'update') {
        setPlantingSubTab('real_tanam_nanas');
      }
    }
  }, [isAdmin, activeTab, plantingSubTab]);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'executive_summary': {
        const subTitles: Record<string, string> = {
          pengolahan_lahan: 'Pengolahan Lahan',
          tanam: 'Tanam',
        };
        const sub = subTitles[executiveSubTab];
        return sub ? `Executive Summary • ${sub}` : 'Executive Summary';
      }
      case 'pengolahan_lahan_bibit_tanam': {
        const subTitles: Record<string, string> = {
          list_stok_lahan: 'List Stok Lahan',
          data_lahan: 'Data Lahan',
        };
        const sub = subTitles[pengolahanSubTab];
        return sub ? `Pengolahan Lahan • ${sub}` : 'Pengolahan Lahan';
      }
      case 'planting': {
        const subTitles: Record<string, string> = {
          real_tanam_nanas: 'Real Tanam Nanas',
          input_real_tanam_petik: 'Input Real Tanam & Petik Nanas',
          proses_selesai_tanam: 'Proses Tanam & Selesai Tanam',
          update: 'Update Tanam',
        };
        const sub = subTitles[plantingSubTab];
        return sub ? `Planting • ${sub}` : 'Planting';
      }
      case 'user_management':
        return 'Manajemen User';
      default:
        return 'Portal Labita';
    }
  };

  // State loading sementara otentikasi di domain online
  if (isClient && !isLocalhost && authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Memeriksa hak akses portal...
          </span>
        </div>
      </div>
    );
  }

  // Tampilan Under Development jika diakses di server online & bukan Admin
  if (isClient && !authLoading && !canAccessLabita) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-700 dark:selection:text-emerald-200 transition-colors duration-200">
        {/* Minimalist Top Header */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              title="Kembali ke Halaman Utama"
              className="w-9 h-9 rounded-xl overflow-hidden bg-white border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-center p-1 shadow-xs hover:ring-2 hover:ring-emerald-400/40 transition-all cursor-pointer"
            >
              <img
                src="/assets/logo.png"
                alt="Great Giant Foods"
                className="w-full h-full object-contain"
              />
            </Link>
            <div className="flex flex-col">
              <span className="text-[11px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100 leading-none uppercase">
                PORTAL LABITA
              </span>
              <span className="text-[9px] text-[#00873D] dark:text-emerald-400 font-semibold tracking-wider uppercase">
                Plantation Group 1
              </span>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Pilih Portal Lain</span>
          </Link>
        </header>

        {/* Centered Under Development Hero */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Top Icon Badge */}
            <div className="mx-auto w-20 h-20 rounded-3xl bg-amber-500/15 border-2 border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <Clock className="w-10 h-10 animate-pulse" />
            </div>

            {/* Title & Desc */}
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-bold">
                <Lock className="w-3 h-3" />
                <span>Under Development &amp; Maintenance</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Portal Labita Sedang Dalam Pengembangan
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
                Portal operasional pengolahan lahan &amp; penanaman nanas PG1 saat ini sedang dalam proses penyempurnaan fitur dan sinkronisasi data. Akses publik via domain online sementara dinonaktifkan.
              </p>
            </div>

            {/* Access Rules Info Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-left space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Status Hak Akses Portal:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="block text-slate-400 dark:text-slate-500 font-medium">Lingkungan Lokal</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Localhost (Buka 100%)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="block text-slate-400 dark:text-slate-500 font-medium">Domain Publik</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">Khusus Administrator</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Link
                href="/login?callbackUrl=/labita"
                className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Lock className="w-4 h-4" />
                <span>Login Administrator</span>
              </Link>
              <Link
                href="/gorong-gorong"
                className="w-full sm:w-auto py-3 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Portal Gorong-Gorong
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-700 dark:selection:text-emerald-200 transition-colors duration-200">
      {/* Top Header with Brand, Controls, Main Menu Navigation & Sub-Menu Navigation */}
      <Header
        currentPortal="labita"
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        executiveSubTab={executiveSubTab}
        setExecutiveSubTab={setExecutiveSubTab}
        pengolahanSubTab={pengolahanSubTab}
        setPengolahanSubTab={setPengolahanSubTab}
        plantingSubTab={plantingSubTab}
        setPlantingSubTab={setPlantingSubTab}
        activeTabTitle={getTabTitle()}
        selectedWilayah={selectedWilayah}
        setSelectedWilayah={setSelectedWilayah}
        availableWilayahs={summaryData?.availableWilayahs || []}
        searchQuery={searchQuery}
        setSearchQuery={(query) => {
          setSearchQuery(query);
          if (typeof window !== 'undefined') {
            if (query) {
              sessionStorage.setItem('labita_table_search', query);
            } else {
              sessionStorage.removeItem('labita_table_search');
            }
          }
          if (query.trim() && (activeTab !== 'pengolahan_lahan_bibit_tanam' || pengolahanSubTab !== 'data_lahan')) {
            setActiveTab('pengolahan_lahan_bibit_tanam');
            setPengolahanSubTab('data_lahan');
          }
        }}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        totalLands={summaryData?.totalLands || 0}
      />

      {/* Main Full-Width Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto max-w-[1700px] w-full mx-auto">
        {/* 1. MENU: EXECUTIVE SUMMARY (Dengan 2 Sub-Menu: Pengolahan Lahan & Tanam) */}
        <div className={activeTab === 'executive_summary' ? 'space-y-8 animate-in fade-in duration-150' : 'hidden'}>
          {/* 1.1 SUB MENU: PENGOLAHAN LAHAN */}
          <div className={executiveSubTab === 'pengolahan_lahan' ? 'space-y-8' : 'hidden'}>
            {/* Kartu Stok Pengolahan */}
            <KpiCards
              data={summaryData}
              selectedYear={stokYear}
              selectedMonth={stokMonth}
              onSelectStokFilter={(yr, m) => {
                setStokYear(yr);
                setStokMonth(m);
              }}
              selectedPeriod={selectedPeriod}
              onSelectPeriod={(p) => setSelectedPeriod(p)}
              chartsData={chartsData}
              onSelectLand={(loc) => setSelectedLandId(loc)}
              selectedWilayah={selectedWilayah}
              setSelectedWilayah={setSelectedWilayah}
              availableWilayahs={summaryData?.availableWilayahs || []}
              activeSubTab="pengolahan_lahan"
            />

            {/* Grafik Rencana vs Realisasi */}
            <RencanaRealisasiSection
              chartsData={chartsData}
              onSelectLand={(loc) => setSelectedLandId(loc)}
            />

            {/* Grafik Rerata Bero dan Tanam */}
            <RerataBeroSection refreshTrigger={refreshLandTrigger} />
          </div>

          {/* 1.2 SUB MENU: TANAM */}
          <div className={executiveSubTab === 'tanam' ? 'space-y-8' : 'hidden'}>
            {/* Kartu Realisasi Tanam */}
            <KpiCards
              data={summaryData}
              selectedYear={stokYear}
              selectedMonth={stokMonth}
              onSelectStokFilter={(yr, m) => {
                setStokYear(yr);
                setStokMonth(m);
              }}
              selectedPeriod={selectedPeriod}
              onSelectPeriod={(p) => setSelectedPeriod(p)}
              chartsData={chartsData}
              onSelectLand={(loc) => setSelectedLandId(loc)}
              selectedWilayah={selectedWilayah}
              setSelectedWilayah={setSelectedWilayah}
              availableWilayahs={summaryData?.availableWilayahs || []}
              activeSubTab="tanam"
            />

            {/* Grid Berdampingan: Monitoring Tanam & Tabel Real Tanam Kemarin */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-7">
                <TanamBenchmarkChart data={chartsData?.tanamBenchmark} />
              </div>
              <div className="lg:col-span-5">
                <RealTanamKemarinTable data={chartsData?.realTanamKemarin} />
              </div>
            </div>

            {/* Grid Berdampingan: Donat Real Tanam Bibit & Grafik Batang Sebaran Bibit / Bulan */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-5">
                <RealTanamBibitDonutChart data={chartsData?.realTanamBibitDonut} />
              </div>
              <div className="lg:col-span-7">
                <SebaranBibitBulanChart data={chartsData?.sebaranBibitBulan} />
              </div>
            </div>

            {/* Grid Berdampingan: Tabel List Lokasi Selesai Tanam & Tabel List Lokasi Proses Tanam */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              <ListLokasiSelesaiTanamTable
                data={chartsData?.listLokasiSelesaiTanam}
              />
              <ListLokasiProsesTanamTable
                data={chartsData?.listLokasiProsesTanam}
              />
            </div>
          </div>
        </div>

        {/* 2. MENU: PENGOLAHAN LAHAN BIBIT TANAM (Dengan 2 Sub-Menu: List Stok Lahan & Data Lahan) */}
        <div className={activeTab === 'pengolahan_lahan_bibit_tanam' ? 'space-y-8 animate-in fade-in duration-150' : 'hidden'}>
          {/* 2.1 SUB MENU: LIST STOK LAHAN */}
          <div className={pengolahanSubTab === 'list_stok_lahan' ? 'block' : 'hidden'}>
            <ListStokLahanView
              onSelectLand={(id) => setSelectedLandId(id)}
              selectedWilayah={selectedWilayah}
              refreshTrigger={refreshLandTrigger}
              chartsData={chartsData}
            />
          </div>

          {/* 2.2 SUB MENU: DATA LAHAN (Keep-Alive agar pencarian tidak reset saat buka menu/sub-menu lain) */}
          <div className={pengolahanSubTab === 'data_lahan' ? 'block' : 'hidden'}>
            <LandTable
              onEditLand={(id) => {
                if (isAdmin) {
                  setEditingLandId(id);
                }
              }}
              onDataChanged={handleSilentDataChanged}
              initialSearch={searchQuery}
              onSearchChange={(query) => {
                setSearchQuery(query);
                if (typeof window !== 'undefined') {
                  if (query) {
                    sessionStorage.setItem('labita_table_search', query);
                  } else {
                    sessionStorage.removeItem('labita_table_search');
                  }
                }
              }}
              selectedWilayah={selectedWilayah}
              refreshTrigger={refreshLandTrigger}
              isAdmin={isAdmin}
            />
          </div>
        </div>

        {/* 3. MENU: PLANTING (Dengan 4 Sub-Menu: Real Tanam Nanas, Input Real Tanam Petik, Proses/Selesai Tanam & Update) */}
        <div className={activeTab === 'planting' ? 'space-y-8 animate-in fade-in duration-150' : 'hidden'}>
          {/* 3.1 SUB MENU: REAL TANAM NANAS (Keep-Alive agar tabel dan filter tidak reset saat berpindah sub-menu) */}
          <div className={plantingSubTab === 'real_tanam_nanas' ? 'block' : 'hidden'}>
            <PlantingView
              onOpenLand={(lokasi) => setSelectedLandId(lokasi)}
              refreshTrigger={refreshLandTrigger}
              isAdmin={isAdmin}
              isActive={plantingSubTab === 'real_tanam_nanas'}
              initialSearch={plantingSearchQuery}
              onDataChanged={handleSilentDataChanged}
              onSearchChange={(q) => {
                setPlantingSearchQuery(q);
                if (typeof window !== 'undefined') {
                  if (q) {
                    sessionStorage.setItem('labita_planting_search', q);
                  } else {
                    sessionStorage.removeItem('labita_planting_search');
                  }
                }
              }}
            />
          </div>

          {/* 3.2 SUB MENU: INPUT REAL TANAM & PETIK NANAS (Master Log Transaksi Detail Tanpa KPI Card) */}
          <div className={plantingSubTab === 'input_real_tanam_petik' ? 'block' : 'hidden'}>
            <InputRealTanamPetikView isAdmin={isAdmin} onDataChanged={handleSilentDataChanged} />
          </div>

          {/* 3.3 SUB MENU: PROSES TANAM & SELESAI TANAM (GRAFIK PER WILAYAH) */}
          <div className={plantingSubTab === 'proses_selesai_tanam' ? 'block' : 'hidden'}>
            <ProsesTanamSection
              chartsData={chartsData}
              onSelectLand={(loc) => setSelectedLandId(loc)}
            />
          </div>

          {/* 3.4 SUB MENU: UPDATE TANAM (Form Cepat Update Tanam - Khusus Admin) */}
          {isAdmin && (
            <div className={plantingSubTab === 'update' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
              <QuickUpdateTanamView onDataChanged={handleSilentDataChanged} isAdmin={isAdmin} />
            </div>
          )}
        </div>

        {/* 4. MENU: MANAJEMEN USER (Khusus Admin) */}
        {isAdmin && (
          <div className={activeTab === 'user_management' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
            <UserManagementView />
          </div>
        )}
      </main>

      {/* Modal Detail Lahan */}
      {selectedLandId !== null && (
        <LandDetailModal
          landId={selectedLandId}
          onClose={() => setSelectedLandId(null)}
          onUpdated={() => {
            setRefreshLandTrigger((prev) => prev + 1);
            loadDashboardData();
          }}
        />
      )}

      {/* Modal Edit Lahan (Hanya untuk Admin) */}
      {isAdmin && editingLandId !== null && (
        <LandEditModal
          landId={editingLandId}
          onClose={() => setEditingLandId(null)}
          onSaved={() => {
            setEditingLandId(null);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}
