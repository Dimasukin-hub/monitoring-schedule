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
import { useAuth } from '@/components/AuthProvider';

export default function LabitaDashboardPage() {
  const { user, isAdmin, isUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('executive_summary');
  const [executiveSubTab, setExecutiveSubTab] = useState<string>('pengolahan_lahan');
  const [pengolahanSubTab, setPengolahanSubTab] = useState<string>('list_stok_lahan');
  const [plantingSubTab, setPlantingSubTab] = useState<string>('real_tanam_nanas');
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
    // Perbarui kartu dashboard di latar belakang tanpa reload tabel dan tanpa jeda/kedipan loading
    loadDashboardData(false, true);
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedWilayah, selectedPeriod, stokYear, stokMonth]);

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
        return sub ? `Pengolahan Lahan Bibit Tanam • ${sub}` : 'Pengolahan Lahan Bibit Tanam';
      }
      case 'planting': {
        const subTitles: Record<string, string> = {
          real_tanam_nanas: 'Real Tanam Nanas',
          proses_selesai_tanam: 'Proses Tanam & Selesai Tanam',
        };
        const sub = subTitles[plantingSubTab];
        return sub ? `Planting • ${sub}` : 'Planting';
      }
      default:
        return 'LABITA - Monitor Schedule 2026';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-700 dark:selection:text-emerald-200 transition-colors duration-200">
      {/* Top Header with Brand, Controls, Main Menu Navigation & Sub-Menu Navigation */}
      <Header
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
      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto max-w-[1700px] w-full mx-auto">
        {/* Banner Status Akses untuk User View Only */}
        {!isAdmin && (
          <div className="p-3.5 px-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>
                <strong>Mode Tinjauan (View Only):</strong> Anda login sebagai pengguna umum. Anda dapat melihat dan mengeksplorasi seluruh data, namun aksi edit dinonaktifkan.
              </span>
            </div>
          </div>
        )}

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

                {/* Grafik Rencana vs Realisasi (Dipindahkan ke sini) */}
                <RencanaRealisasiSection
                  chartsData={chartsData}
                  onSelectLand={(loc) => setSelectedLandId(loc)}
                />

                {/* Grafik Rerata Bero dan Tanam (Dipindahkan ke sini) */}
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

        {/* 3. MENU: PLANTING (Dengan 2 Sub-Menu: Real Tanam Nanas & Proses Tanam/Selesai Tanam) */}
        <div className={activeTab === 'planting' ? 'space-y-8 animate-in fade-in duration-200' : 'hidden'}>
          {/* 3.1 SUB MENU: REAL TANAM NANAS (Keep-Alive agar tabel dan filter tidak reset saat berpindah sub-menu) */}
          <div className={plantingSubTab === 'real_tanam_nanas' ? 'block' : 'hidden'}>
            <PlantingView
              onOpenLand={(lokasi) => setSelectedLandId(lokasi)}
              refreshTrigger={refreshLandTrigger}
              isAdmin={isAdmin}
              initialSearch={plantingSearchQuery}
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

          {/* 3.2 SUB MENU: PROSES TANAM & SELESAI TANAM (GRAFIK PER WILAYAH) */}
          {plantingSubTab === 'proses_selesai_tanam' && (
            <ProsesTanamSection
              chartsData={chartsData}
              onSelectLand={(loc) => setSelectedLandId(loc)}
              selectedWilayah={prosesTanamWilayah}
              setSelectedWilayah={setProsesTanamWilayah}
              availableWilayahs={summaryData?.availableWilayahs || []}
            />
          )}
        </div>
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
