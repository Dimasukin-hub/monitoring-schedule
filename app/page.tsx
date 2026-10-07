'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import KpiCards from '@/components/KpiCards';
import {
  PosisiLahanSection,
  RencanaRealisasiSection,
  ProsesTanamSection,
} from '@/components/ChartsSection';
import LandTable from '@/components/LandTable';
import ListStokLahanView from '@/components/ListStokLahanView';
import LandDetailModal from '@/components/LandDetailModal';
import LandEditModal from '@/components/LandEditModal';
import RerataBeroSection from '@/components/RerataBeroSection';
import PengolahanView from '@/components/PengolahanView';
import TanamView from '@/components/TanamView';
import BibitView from '@/components/BibitView';
import PanenView from '@/components/PanenView';
import PlantingView from '@/components/PlantingView';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedWilayah, setSelectedWilayah] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('LATEST');
  const [stokYear, setStokYear] = useState<number>(2026);
  const [stokMonth, setStokMonth] = useState<string>('CURRENT');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLandId, setSelectedLandId] = useState<number | string | null>(null);
  const [editingLandId, setEditingLandId] = useState<number | string | null>(null);
  const [refreshLandTrigger, setRefreshLandTrigger] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  const [summaryData, setSummaryData] = useState<any>(null);
  const [chartsData, setChartsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load Dashboard Summary & Charts
  const loadDashboardData = (isManualRefresh = false) => {
    setIsLoading(true);
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

  useEffect(() => {
    loadDashboardData();
  }, [selectedWilayah, selectedPeriod, stokYear, stokMonth]);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'overview':
        return 'Overview Dashboard';
      case 'lahan':
        return 'Data Lahan & Rencana vs Real';
      case 'stok':
        return 'List Stok Lahan';
      case 'pengolahan':
        return 'Tahapan Aktivitas Fisik';
      case 'tanam':
        return 'Monitoring Tanam';
      case 'planting':
        return 'Monitoring Planting - Real Tanam Nanas';
      case 'bibit':
        return 'Monitoring Bibit';
      case 'panen':
        return 'Panen & Produksi';
      default:
        return 'Monitor Schedule 2026';
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-700 dark:selection:text-emerald-200 transition-colors duration-200">
      {/* Sidebar Navigation (Bab 6 PRD) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalLands={summaryData?.totalLands || 0}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          activeTabTitle={getTabTitle()}
          selectedWilayah={selectedWilayah}
          setSelectedWilayah={setSelectedWilayah}
          availableWilayahs={summaryData?.availableWilayahs || []}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />

        <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto max-w-[1600px] w-full mx-auto">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Executive Summary Cards */}
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
              />

              {/* 1. Posisi Lahan per wilayah (BK, BJK, SN) */}
              <PosisiLahanSection
                chartsData={chartsData}
                onSelectLand={(loc) => setSelectedLandId(loc)}
              />

              {/* 2. Rencana vs Realisasi (Ha) */}
              <RencanaRealisasiSection
                chartsData={chartsData}
                onSelectLand={(loc) => setSelectedLandId(loc)}
              />

              {/* 3. Rerata Bero Lokasi SN (Tabel & Summary Grafik) */}
              <RerataBeroSection refreshTrigger={refreshLandTrigger} />

              {/* 4. Monitoring Proses & Selesai Tanam per Wilayah */}
              <ProsesTanamSection
                chartsData={chartsData}
                onSelectLand={(loc) => setSelectedLandId(loc)}
              />

              {/* Data Lahan Preview Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Tabel Data Lahan & Rencana vs Real
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Klik pada salah satu baris untuk membuka profil lengkap dan timeline aktivitas lokasi
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('lahan')}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline cursor-pointer"
                  >
                    Buka Halaman Penuh &rarr;
                  </button>
                </div>

                <LandTable
                  onSelectLand={(id) => setSelectedLandId(id)}
                  onEditLand={(id) => setEditingLandId(id)}
                  initialSearch={searchQuery}
                  selectedWilayah={selectedWilayah}
                  refreshTrigger={refreshLandTrigger}
                />
              </div>
            </div>
          )}

          {/* TAB 2: DATA LAHAN (Bab 15-20 PRD) */}
          {activeTab === 'lahan' && (
            <div className="space-y-6">
              <LandTable
                onSelectLand={(id) => setSelectedLandId(id)}
                onEditLand={(id) => setEditingLandId(id)}
                initialSearch={searchQuery}
                selectedWilayah={selectedWilayah}
                refreshTrigger={refreshLandTrigger}
              />
            </div>
          )}

          {/* TAB 3: LIST STOK LAHAN (Bab 21-23 PRD) */}
          {activeTab === 'stok' && (
            <ListStokLahanView
              onSelectLand={(id) => setSelectedLandId(id)}
              selectedWilayah={selectedWilayah}
              refreshTrigger={refreshLandTrigger}
            />
          )}

          {/* TAB 4: PENGOLAHAN LAHAN (Bab 11 PRD) */}
          {activeTab === 'pengolahan' && (
            <PengolahanView
              activityFunnel={chartsData?.activityFunnel || []}
              onFilterByActivity={() => {
                setActiveTab('lahan');
              }}
            />
          )}

          {/* TAB 5: MONITORING TANAM (Bab 24 PRD) */}
          {activeTab === 'tanam' && (
            <TanamView
              tanamCounts={summaryData?.tanamStatusCounts}
              totalRealisasiHa={summaryData?.totalRealisasiHa || 0}
              totalLuasNetto={summaryData?.totalLuasNetto || 0}
              plantingByMonth={chartsData?.plantingByMonth || []}
              onOpenLand={(lokasi) => setSelectedLandId(lokasi)}
              refreshTrigger={refreshLandTrigger}
            />
          )}

          {/* TAB 6: PLANTING (Update Real Tanam Nanas - Sheet RTN) */}
          {activeTab === 'planting' && (
            <PlantingView
              onOpenLand={(lokasi) => setSelectedLandId(lokasi)}
              refreshTrigger={refreshLandTrigger}
            />
          )}

          {/* TAB 7: BIBIT (Bab 25 PRD) */}
          {activeTab === 'bibit' && (
            <BibitView seedSummaries={chartsData?.seedSummaries || []} />
          )}

          {/* TAB 7: PANEN & PRODUKSI (Bab 26 PRD) */}
          {activeTab === 'panen' && (
            <PanenView onOpenLand={(lokasi) => setSelectedLandId(lokasi)} refreshTrigger={refreshLandTrigger} />
          )}
        </main>
      </div>

      {/* Land Detail Modal / Drawer (Bab 27 PRD) */}
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

      {/* Land Edit Modal (Fitur Edit Keseluruhan Data Lahan) */}
      {editingLandId !== null && (
        <LandEditModal
          landId={editingLandId}
          onClose={() => setEditingLandId(null)}
          onSaved={() => {
            setRefreshLandTrigger((prev) => prev + 1);
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
}
