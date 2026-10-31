'use client';

import React, { useState, useEffect } from 'react';
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
import MonitorGorongGorongView from '@/components/MonitorGorongGorongView';
import FormOrderGorongGorongView from '@/components/FormOrderGorongGorongView';
import OrderSulamBibitView from '@/components/OrderSulamBibitView';
import MasterStatusLokasiView from '@/components/MasterStatusLokasiView';
import MasterWaterloggingView from '@/components/MasterWaterloggingView';
import MasterSapUploadView from '@/components/MasterSapUploadView';
import PortalLandingView from '@/components/PortalLandingView';
import { useAuth } from '@/components/AuthProvider';

export default function DashboardPage() {
  const { user, isAdmin, isUser } = useAuth();

  // Portal State: 'landing' (pilih portal), 'labita' (Portal Labita), atau 'gorong_gorong' (Portal Gorong-Gorong)
  const [selectedPortal, setSelectedPortal] = useState<'landing' | 'labita' | 'gorong_gorong'>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('ggf_selected_portal');
      if (saved === 'labita' || saved === 'gorong_gorong') return saved;
    }
    return 'landing';
  });

  const handleSelectPortal = (portal: 'labita' | 'gorong_gorong') => {
    setSelectedPortal(portal);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ggf_selected_portal', portal);
    }
    if (portal === 'labita') {
      setActiveTab('executive_summary');
    } else {
      setActiveTab('monitor_gorong_gorong');
    }
  };

  const handleSwitchPortal = (target: 'labita' | 'gorong_gorong' | 'landing') => {
    setSelectedPortal(target);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ggf_selected_portal', target);
    }
    if (target === 'labita') {
      setActiveTab('executive_summary');
    } else if (target === 'gorong_gorong') {
      setActiveTab('monitor_gorong_gorong');
    }
  };

  const [activeTab, setActiveTab] = useState<string>('executive_summary');
  const [executiveSubTab, setExecutiveSubTab] = useState<string>('pengolahan_lahan');
  const [pengolahanSubTab, setPengolahanSubTab] = useState<string>('list_stok_lahan');
  const [plantingSubTab, setPlantingSubTab] = useState<string>('real_tanam_nanas');
  const [orderWilayahSubTab, setOrderWilayahSubTab] = useState<string>('order_gorong_gorong');
  const [masterDataSubTab, setMasterDataSubTab] = useState<string>('master_status_lokasi');
  const [selectedWilayah, setSelectedWilayah] = useState<string>('ALL');
  const [prosesTanamWilayah, setProsesTanamWilayah] = useState<string>('ALL');
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

    const startTime = Date.now();

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
        if (isSilent) {
          return;
        }
        if (isManualRefresh) {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, 500 - elapsed);
          setTimeout(() => setIsLoading(false), remaining);
        } else {
          setIsLoading(false);
        }
      });
  };

  const handleRefresh = () => {
    setRefreshLandTrigger((prev) => prev + 1);
    loadDashboardData(true);
  };

  const handleSilentDataChanged = () => {
    // Perbarui kartu dashboard & grafik bero di latar belakang tanpa reload tabel dan tanpa jeda/kedipan loading
    setRefreshLandTrigger((prev) => prev + 1);
    loadDashboardData(false, true);
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedWilayah, selectedPeriod, stokYear, stokMonth]);

  useEffect(() => {
    if (!isAdmin) {
      if (activeTab === 'user_management' || activeTab === 'master_data') {
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
      case 'monitor_gorong_gorong':
        return 'Monitor Gorong-Gorong PG1';
      case 'order_wilayah': {
        const subTitles: Record<string, string> = {
          order_gorong_gorong: 'Order Gorong-Gorong',
          order_sulam_bibit: 'Order Sulam Bibit',
        };
        const sub = subTitles[orderWilayahSubTab];
        return sub ? `Order Wilayah • ${sub}` : 'Order Wilayah';
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
        return 'Monitor Schedule 2026';
    }
  };

  // Jika sedang berada di Landing Page Pemilihan Portal
  if (selectedPortal === 'landing') {
    return <PortalLandingView onSelectPortal={handleSelectPortal} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-700 dark:selection:text-emerald-200 transition-colors duration-200">
      {/* Top Header with Brand, Controls, Main Menu Navigation & Sub-Menu Navigation */}
      <Header
        currentPortal={selectedPortal}
        onSwitchPortal={handleSwitchPortal}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        executiveSubTab={executiveSubTab}
        setExecutiveSubTab={setExecutiveSubTab}
        pengolahanSubTab={pengolahanSubTab}
        setPengolahanSubTab={setPengolahanSubTab}
        plantingSubTab={plantingSubTab}
        setPlantingSubTab={setPlantingSubTab}
        orderWilayahSubTab={orderWilayahSubTab}
        setOrderWilayahSubTab={setOrderWilayahSubTab}
        masterDataSubTab={masterDataSubTab}
        setMasterDataSubTab={setMasterDataSubTab}
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
        {activeTab === 'executive_summary' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* 1.1 SUB MENU: PENGOLAHAN LAHAN */}
            {executiveSubTab === 'pengolahan_lahan' && (
              <div className="space-y-8">
                {/* Kartu Stok Pengolahan (Stok Bongkar & Stok Bajak Kompak di Kiri, Stok Siap Tanam Besar di Kanan) */}
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
            )}

            {/* 1.2 SUB MENU: TANAM */}
            {executiveSubTab === 'tanam' && (
              <div className="space-y-8">
                {/* Kartu Realisasi Tanam, Real Tanam Bulanan, dan Card Proses Tanam */}
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
            )}
          </div>
        )}

        {/* 2. MENU: PENGOLAHAN LAHAN BIBIT TANAM (Dengan 2 Sub-Menu: List Stok Lahan & Data Lahan) */}
        <div className={activeTab === 'pengolahan_lahan_bibit_tanam' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
          {/* 2.1 SUB MENU: LIST STOK LAHAN */}
          {pengolahanSubTab === 'list_stok_lahan' && (
            <ListStokLahanView
              onSelectLand={(id) => setSelectedLandId(id)}
              selectedWilayah={selectedWilayah}
              refreshTrigger={refreshLandTrigger}
              chartsData={chartsData}
            />
          )}

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

        {/* ========================================================================= */}
        {/* PORTAL MONITOR GORONG-GORONG (MENU MONITOR GORONG-GORONG)                */}
        {/* ========================================================================= */}
        <div className={activeTab === 'monitor_gorong_gorong' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
          <MonitorGorongGorongView />
        </div>

        {/* 3. MENU: PLANTING (Dengan 3 Sub-Menu: Real Tanam Nanas, Input Real Tanam Petik & Proses/Selesai Tanam) */}
        <div className={activeTab === 'planting' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
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
          {plantingSubTab === 'proses_selesai_tanam' && (
            <ProsesTanamSection
              chartsData={chartsData}
              onSelectLand={(loc) => setSelectedLandId(loc)}
            />
          )}

          {/* 3.4 SUB MENU: UPDATE TANAM (Form Cepat Update Tanam - Khusus Admin) */}
          {isAdmin && (
            <div className={plantingSubTab === 'update' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
              <QuickUpdateTanamView onDataChanged={handleSilentDataChanged} isAdmin={isAdmin} />
            </div>
          )}
        </div>

        {/* 4. MENU: ORDER WILAYAH (Order Gorong-Gorong & Order Sulam Bibit) */}
        <div className={activeTab === 'order_wilayah' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
          {/* 4.1 SUB MENU: ORDER GORONG-GORONG */}
          <div className={orderWilayahSubTab === 'order_gorong_gorong' ? 'block' : 'hidden'}>
            <FormOrderGorongGorongView />
          </div>

          {/* 4.2 SUB MENU: ORDER SULAM BIBIT */}
          <div className={orderWilayahSubTab === 'order_sulam_bibit' ? 'block' : 'hidden'}>
            <OrderSulamBibitView />
          </div>
        </div>

        {/* 5. MENU: MASTER DATA (Khusus Admin - Master Status Lokasi, Master Waterlogging, Upload Data Realisasi SAP) */}
        {isAdmin && (
          <div className={activeTab === 'master_data' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
            {/* 5.1 SUB MENU: MASTER STATUS LOKASI */}
            <div className={masterDataSubTab === 'master_status_lokasi' ? 'block' : 'hidden'}>
              <MasterStatusLokasiView />
            </div>

            {/* 5.2 SUB MENU: MASTER WATERLOGGING */}
            <div className={masterDataSubTab === 'master_waterlogging' ? 'block' : 'hidden'}>
              <MasterWaterloggingView />
            </div>

            {/* 5.3 SUB MENU: UPLOAD DATA REALISASI SAP */}
            <div className={masterDataSubTab === 'master_sap' ? 'block' : 'hidden'}>
              <MasterSapUploadView />
            </div>
          </div>
        )}

        {/* 6. MENU: MANAJEMEN USER (Khusus Admin) */}
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
