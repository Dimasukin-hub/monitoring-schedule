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
import PengolahanView from '@/components/PengolahanView';
import TanamView from '@/components/TanamView';
import BibitView from '@/components/BibitView';
import PanenView from '@/components/PanenView';
import PlantingView from '@/components/PlantingView';
import { useAuth } from '@/components/AuthProvider';

export default function LabitaDashboardPage() {
  const { user, isAdmin, isUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [overviewSubTab, setOverviewSubTab] = useState<string>('executive_summary');
  const [selectedWilayah, setSelectedWilayah] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('LATEST');
  const [stokYear, setStokYear] = useState<number>(2026);
  const [stokMonth, setStokMonth] = useState<string>('CURRENT');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLandId, setSelectedLandId] = useState<number | string | null>(null);
  const [editingLandId, setEditingLandId] = useState<number | string | null>(null);
  const [refreshLandTrigger, setRefreshLandTrigger] = useState<number>(0);

  const [summaryData, setSummaryData] = useState<any>(null);
  const [chartsData, setChartsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Redirect legacy / external 'lahan' tab to overview sub-tab data_lahan
  useEffect(() => {
    if (activeTab === 'lahan') {
      setActiveTab('overview');
      setOverviewSubTab('data_lahan');
    }
  }, [activeTab]);

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
      case 'overview': {
        const subTitles: Record<string, string> = {
          executive_summary: 'Executive Summary',
          rencana_realisasi: 'Rencana vs Realisasi',
          rerata_bero_tanam: 'Rerata Bero dan Tanam',
          proses_selesai_tanam: 'Proses Tanam & Selesai Tanam',
          data_lahan: 'Data Lahan',
        };
        const sub = subTitles[overviewSubTab];
        return sub ? `Overview • ${sub}` : 'Overview Dashboard';
      }
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
        return 'LABITA - Monitor Schedule 2026';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-700 dark:selection:text-emerald-200 transition-colors duration-200">
      {/* Top Header with Brand, Controls, Main Menu Navigation & Overview Sub-Menu Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'overview') {
            setOverviewSubTab('executive_summary');
          }
        }}
        activeTabTitle={getTabTitle()}
        selectedWilayah={selectedWilayah}
        setSelectedWilayah={setSelectedWilayah}
        availableWilayahs={summaryData?.availableWilayahs || []}
        searchQuery={searchQuery}
        setSearchQuery={(query) => {
          setSearchQuery(query);
          if (query.trim() && overviewSubTab !== 'data_lahan') {
            setOverviewSubTab('data_lahan');
          }
        }}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        overviewSubTab={overviewSubTab}
        setOverviewSubTab={setOverviewSubTab}
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

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* 1. SUB MENU: EXECUTIVE SUMMARY */}
            {overviewSubTab === 'executive_summary' && (
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
              />
            )}

            {/* 3. SUB MENU: RENCANA VS REALISASI */}
            {overviewSubTab === 'rencana_realisasi' && (
              <RencanaRealisasiSection
                chartsData={chartsData}
                onSelectLand={(loc) => setSelectedLandId(loc)}
              />
            )}

            {/* 4. SUB MENU: RERATA BERO DAN TANAM */}
            {overviewSubTab === 'rerata_bero_tanam' && (
              <RerataBeroSection refreshTrigger={refreshLandTrigger} />
            )}

            {/* 5. SUB MENU: PROSES TANAM & SELESAI TANAM */}
            {overviewSubTab === 'proses_selesai_tanam' && (
              <ProsesTanamSection
                chartsData={chartsData}
                onSelectLand={(loc) => setSelectedLandId(loc)}
              />
            )}

            {/* 6. SUB MENU: DATA LAHAN */}
            {overviewSubTab === 'data_lahan' && (
              <LandTable
                onSelectLand={(id) => setSelectedLandId(id)}
                onEditLand={(id) => {
                  if (isAdmin) {
                    setEditingLandId(id);
                  }
                }}
                onDataChanged={handleRefresh}
                initialSearch={searchQuery}
                selectedWilayah={selectedWilayah}
                refreshTrigger={refreshLandTrigger}
                isAdmin={isAdmin}
              />
            )}
          </div>
        )}

        {/* TAB 2: LIST STOK LAHAN */}
        {activeTab === 'stok' && (
          <div className="animate-in fade-in duration-200">
            <ListStokLahanView
              onSelectLand={(id) => setSelectedLandId(id)}
              selectedWilayah={selectedWilayah}
              refreshTrigger={refreshLandTrigger}
            />
          </div>
        )}

        {/* TAB 3: PLANTING */}
        {activeTab === 'planting' && (
          <div className="animate-in fade-in duration-200">
            <PlantingView
              onOpenLand={(lokasi) => setSelectedLandId(lokasi)}
              refreshTrigger={refreshLandTrigger}
              isAdmin={isAdmin}
            />
          </div>
        )}

        {/* TAB 4: PENGOLAHAN LAHAN */}
        {activeTab === 'pengolahan' && (
          <div className="animate-in fade-in duration-200">
            <PengolahanView
              activityFunnel={chartsData?.activityFunnel || []}
              onFilterByActivity={() => {
                setActiveTab('overview');
                setOverviewSubTab('data_lahan');
              }}
            />
          </div>
        )}

        {/* TAB 5: MONITORING TANAM */}
        {activeTab === 'tanam' && (
          <div className="animate-in fade-in duration-200">
            <TanamView
              tanamCounts={summaryData?.tanamStatusCounts}
              totalRealisasiHa={summaryData?.totalRealisasiHa || 0}
              totalLuasNetto={summaryData?.totalLuasNetto || 0}
              plantingByMonth={chartsData?.plantingByMonth || []}
              onOpenLand={(lokasi) => setSelectedLandId(lokasi)}
              refreshTrigger={refreshLandTrigger}
            />
          </div>
        )}

        {/* TAB 6: MONITORING BIBIT */}
        {activeTab === 'bibit' && (
          <div className="animate-in fade-in duration-200">
            <BibitView seedSummaries={chartsData?.seedSummaries || []} />
          </div>
        )}

        {/* TAB 7: PANEN & PRODUKSI */}
        {activeTab === 'panen' && (
          <div className="animate-in fade-in duration-200">
            <PanenView onOpenLand={(lokasi) => setSelectedLandId(lokasi)} refreshTrigger={refreshLandTrigger} />
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
