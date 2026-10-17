'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Boxes,
  ChevronDown,
  Check,
  Layers,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import {
  getStokLahanSummary,
  AVAILABLE_STOK_YEARS,
  ALL_MONTH_NAMES,
  getCurrentMonthName,
  StokLahanSummaryResult,
} from '@/lib/stokLahanCalculator';
import { ChartsDataProps } from './ChartsSection';

interface KpiData {
  totalLands: number;
  stokLahanSummary?: StokLahanSummaryResult;
  stokLahanHa?: number;
  stokBongkarHa?: number;
  stokBongkarDetails?: {
    selectedPeriod: string;
    realBkPrev: number;
    realBkPrevMonth: string;
    realBkNow: number;
    realBkNowMonth: string;
    realBajakNow: number;
    stokBongkarHa: number;
    formula: string;
  };
  availablePeriods?: string[];
  totalLuasBruto: number;
  totalLuasNetto: number;
  totalRealisasiHa: number;
  overallProgress: number;
  realisasiTanamSummary?: {
    nilaiHa: number;
    targetFullYearHa: number;
    targetRencanaHa: number;
    pencapaianPct: number;
    ytdHa: number;
    ytdRcnHa: number;
    periodLabel: string;
    isFilteredPeriod?: boolean;
  };
  realisasiTanamMtdSummary?: {
    nilaiHa: number;
    targetBulanHa: number;
    pencapaianPct: number;
    periodLabel: string;
    monthName?: string;
  };
  prosesTanamSummary?: {
    prosesHa: number;
    prosesCount: number;
    selesaiHa: number;
    selesaiCount: number;
    totalLuasNetto: number;
    totalLands: number;
  };
  stockStageCounts?: {
    bk: number;
    bjk: number;
    sn: number;
    proses: number;
    selesai: number;
  };
  tanamStatusCounts?: {
    selesai: number;
    proses: number;
    belum: number;
  };
}

interface KpiCardsProps {
  data: KpiData | null;
  selectedYear?: number;
  selectedMonth?: string;
  onSelectStokFilter?: (year: number, month: string) => void;
  // Legacy / fallback period props if needed
  selectedPeriod?: string;
  onSelectPeriod?: (period: string) => void;
  chartsData?: ChartsDataProps | null;
  onSelectLand?: (landId: string) => void;
  selectedWilayah?: string;
  setSelectedWilayah?: (wilayah: string) => void;
  availableWilayahs?: string[];
  activeSubTab?: 'pengolahan_lahan' | 'tanam';
}

interface PreviewItem {
  wilayah: string;
  lokasi: string;
  realDate: string;
  luasNetto?: number;
}

interface PreviewCardData {
  count: number;
  totalNetto: number;
  items: PreviewItem[];
}

function CardStockPopupTable({
  title,
  dateColumnHeader,
  titleColorClass,
  data,
  selectedWilayah,
  onMouseEnter,
  onMouseLeave,
  align = 'left',
}: {
  title: string;
  dateColumnHeader: string;
  titleColorClass: string;
  data?: PreviewCardData;
  selectedWilayah?: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  align?: 'left' | 'right';
}) {
  const displayItems = useMemo(() => {
    if (!data?.items) return [];
    if (selectedWilayah && selectedWilayah !== 'ALL') {
      return data.items.filter((it) => it.wilayah === selectedWilayah);
    }
    return data.items;
  }, [data, selectedWilayah]);

  const displayNetto = useMemo(() => {
    return displayItems.reduce((acc, it) => acc + (it.luasNetto || 0), 0);
  }, [displayItems]);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`absolute top-full mt-2 ${
        align === 'right' ? 'right-0' : 'left-0'
      } z-50 w-[360px] sm:w-[380px] max-w-[calc(100vw-24px)] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-2xl p-3.5 animate-in fade-in-0 zoom-in-95 duration-150 select-none ring-1 ring-black/5 dark:ring-white/10`}
    >
      {/* Judul Pop-up Ditengah (Tanpa keterangan jumlah lokasi) */}
      <div className="text-center pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
        <h4 className={`text-xs font-black tracking-wider uppercase ${titleColorClass}`}>
          {title}
        </h4>
      </div>

      {/* Tabel Pop-up: Header & Isi Kolom Ditengah */}
      <div className="max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 rounded-none border border-slate-200/70 dark:border-slate-800">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
            <tr>
              <th className="py-1.5 px-2 text-center border-b border-slate-200 dark:border-slate-700/80 w-[28%]">
                WILAYAH
              </th>
              <th className="py-1.5 px-2 text-center border-b border-slate-200 dark:border-slate-700/80 w-[32%]">
                LOKASI
              </th>
              <th className="py-1.5 px-2 text-center border-b border-slate-200 dark:border-slate-700/80 w-[40%]">
                {dateColumnHeader}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white/50 dark:bg-slate-900/50">
            {displayItems.length > 0 ? (
              displayItems.map((item, idx) => (
                <tr
                  key={`${item.lokasi}-${idx}`}
                  className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <td className="py-1.5 px-2 text-center font-medium text-slate-700 dark:text-slate-300">
                    {item.wilayah || '-'}
                  </td>
                  <td className="py-1.5 px-2 text-center font-bold text-slate-900 dark:text-slate-100">
                    {item.lokasi || '-'}
                  </td>
                  <td className="py-1.5 px-2 text-center font-medium text-slate-600 dark:text-slate-400">
                    {item.realDate || '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-400 text-xs italic">
                  Tidak ada data lokasi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Total di Kiri Sesuai Permintaan User */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-left text-slate-600 dark:text-slate-400 font-medium">
        Total: <strong className="font-bold text-slate-800 dark:text-slate-200">{displayItems.length} Lokasi</strong> •{' '}
        <strong className="font-bold text-slate-800 dark:text-slate-200">
          {displayNetto.toLocaleString('id-ID', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          Ha Netto
        </strong>
      </div>
    </div>
  );
}

export default function KpiCards({
  data,
  selectedYear = 2026,
  selectedMonth = 'CURRENT',
  onSelectStokFilter,
  selectedPeriod,
  onSelectPeriod,
  chartsData,
  onSelectLand,
  selectedWilayah,
  setSelectedWilayah,
  availableWilayahs,
  activeSubTab = 'pengolahan_lahan',
}: KpiCardsProps) {
  // Popover state for Stok cards
  const [hoveredCard, setHoveredCard] = useState<'BK' | 'BJK' | 'SN' | null>(null);
  const hoverCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [previewCards, setPreviewCards] = useState<{
    BK?: PreviewCardData;
    BJK?: PreviewCardData;
    SN?: PreviewCardData;
  } | null>(null);

  // Fetch preview data for card hover tables
  useEffect(() => {
    let isMounted = true;
    fetch('/api/stok?preview=true')
      .then((res) => res.json())
      .then((res) => {
        if (isMounted && res.success && res.previewCards) {
          setPreviewCards(res.previewCards);
        }
      })
      .catch((err) => console.error('Failed to load stok preview cards:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCardMouseEnter = (cat: 'BK' | 'BJK' | 'SN') => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    setHoveredCard(cat);
  };

  const handleCardMouseLeave = () => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
    }
    hoverCloseTimerRef.current = setTimeout(() => {
      setHoveredCard(null);
    }, 200);
  };

  // Helper to parse month prop to array of month names
  // Catatan: Jika 'CURRENT' atau kosong, default adalah array KOSONG []
  // sehingga checkbox tidak tercentang semua secara default!
  const parseMonths = (mStr?: string): string[] => {
    if (!mStr || mStr === 'CURRENT' || mStr === 'DEFAULT') return [];
    if (mStr === 'ALL') return [...ALL_MONTH_NAMES];
    return mStr.split(',').map((m) => m.trim()).filter(Boolean);
  };

  // Local state for active year & month selection
  const [internalYear, setInternalYear] = useState<number>(selectedYear);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => parseMonths(selectedMonth));
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State untuk tab aktif grafik Posisi Lahan (default: 'ALL' / Semua)
  const [activeStageChart, setActiveStageChart] = useState<'BK' | 'BJK' | 'SN' | 'ALL'>('ALL');
  // State filter wilayah independen khusus untuk grafik Posisi Lahan
  const [posisiLahanWilayah, setPosisiLahanWilayah] = useState<string>('ALL');

  // Sync with prop changes
  useEffect(() => {
    if (selectedYear) setInternalYear(selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    if (selectedMonth !== undefined) {
      setSelectedMonths(parseMonths(selectedMonth));
    }
  }, [selectedMonth]);

  // Derived month query string: 'CURRENT' saat kosong, 'ALL' saat 12 bulan terpilih
  const internalMonthStr = useMemo(() => {
    if (selectedMonths.length === 0) {
      return 'CURRENT';
    }
    if (selectedMonths.length === ALL_MONTH_NAMES.length) {
      return 'ALL';
    }
    return selectedMonths.join(',');
  }, [selectedMonths]);

  // Current calendar month name dynamically (Okt saat ini, Nov saat masuk November, dst)
  const currentMonthName = getCurrentMonthName();

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Handle year switch
  const handleSelectYear = (yr: number) => {
    setInternalYear(yr);
    if (onSelectStokFilter) {
      onSelectStokFilter(yr, internalMonthStr);
    }
  };

  // Multi-select toggle for a specific month
  const handleToggleMonth = (m: string) => {
    let next: string[];
    if (selectedMonths.includes(m)) {
      next = selectedMonths.filter((x) => x !== m);
    } else {
      next = [...selectedMonths, m];
    }
    setSelectedMonths(next);
    const nextMonthStr =
      next.length === 0
        ? 'CURRENT'
        : next.length === ALL_MONTH_NAMES.length
        ? 'ALL'
        : next.join(',');
    if (onSelectStokFilter) {
      onSelectStokFilter(internalYear, nextMonthStr);
    }
  };

  // Select all 12 months at once
  const handleSelectAll = () => {
    const next = [...ALL_MONTH_NAMES];
    setSelectedMonths(next);
    if (onSelectStokFilter) {
      onSelectStokFilter(internalYear, 'ALL');
    }
  };

  // Clear / Reset to default clean state (Bulan Berjalan Otomatis, tanpa centang)
  const handleReset = () => {
    setInternalYear(2026);
    setSelectedMonths([]);
    if (onSelectStokFilter) {
      onSelectStokFilter(2026, 'CURRENT');
    }
  };

  // Filter sedang aktif jika ada bulan yang dicentang atau tahun diubah dari default
  const isFiltered =
    internalYear !== 2026 || selectedMonths.length > 0;

  // Compute stock summary: use server-provided data if matched, or compute instantaneously on client
  const stokSummary: StokLahanSummaryResult = useMemo(() => {
    const effectiveMonth = selectedMonths.length === 0 ? currentMonthName : internalMonthStr;
    if (data?.stokLahanSummary) {
      // 1. Direct match with current selection
      if (
        data.stokLahanSummary.year === internalYear &&
        (data.stokLahanSummary.month === effectiveMonth ||
          (selectedMonths.length === 0 && data.stokLahanSummary.month === currentMonthName) ||
          (internalMonthStr === 'ALL' && data.stokLahanSummary.month === 'ALL'))
      ) {
        return data.stokLahanSummary;
      }

      // 2. Derive dynamically from monthlyBreakdown provided by PostgreSQL
      if (data.stokLahanSummary.monthlyBreakdown && data.stokLahanSummary.monthlyBreakdown.length > 0) {
        const breakdown = data.stokLahanSummary.monthlyBreakdown;
        const targetMonths = selectedMonths.length === 0 ? [currentMonthName] : selectedMonths;

        if (internalMonthStr === 'ALL') {
          const decRecord = breakdown.find((r) => r.monthIndex === 12) || breakdown[breakdown.length - 1];
          let totalBongkar = 0;
          let totalBajak = 0;
          let totalSn = 0;
          let totalTanam = 0;
          for (const r of breakdown) {
            totalBongkar += r.bongkar;
            totalBajak += r.bajak;
            totalSn += r.sn;
            totalTanam += r.tanam;
          }
          const totalLahan = totalBongkar + totalBajak + totalSn + totalTanam;
          return {
            year: internalYear,
            month: 'ALL',
            monthLabel: `Tahun ${internalYear} (Semua Bulan)`,
            stokLahan: {
              value: Math.round(totalLahan * 100) / 100,
              formula: `Bongkar (${totalBongkar.toFixed(2)}) + Bajak (${totalBajak.toFixed(2)}) + SN (${totalSn.toFixed(2)}) + Tanam (${totalTanam.toFixed(2)})`,
              details: {
                bongkar: Math.round(totalBongkar * 100) / 100,
                bajak: Math.round(totalBajak * 100) / 100,
                sn: Math.round(totalSn * 100) / 100,
                tanam: Math.round(totalTanam * 100) / 100,
              },
            },
            stokBongkar: { value: decRecord.stokBongkar, formula: decRecord.stokBongkarFormula || '' },
            stokBajak: { value: decRecord.stokBajak, formula: decRecord.stokBajakFormula || '' },
            stokSN: { value: decRecord.stokSN, formula: decRecord.stokSNFormula || '' },
            totalStok: { value: decRecord.totalStok, formula: '' },
            monthlyBreakdown: breakdown,
            availableYears: AVAILABLE_STOK_YEARS,
            availableMonths: ALL_MONTH_NAMES,
          };
        }

        const filtered = breakdown.filter((r) => targetMonths.includes(r.month));
        if (filtered.length > 0) {
          filtered.sort((a, b) => a.monthIndex - b.monthIndex);
          const latestItem = filtered[filtered.length - 1];
          let totalBongkar = 0;
          let totalBajak = 0;
          let totalSn = 0;
          let totalTanam = 0;
          for (const item of filtered) {
            totalBongkar += item.bongkar;
            totalBajak += item.bajak;
            totalSn += item.sn;
            totalTanam += item.tanam;
          }
          const totalMonthLahan = totalBongkar + totalBajak + totalSn + totalTanam;
          return {
            year: internalYear,
            month: targetMonths.join(','),
            monthLabel: filtered.length === 1 ? `${filtered[0].month} ${internalYear}` : `${filtered.length} Bulan`,
            stokLahan: {
              value: Math.round(totalMonthLahan * 100) / 100,
              formula: `Bongkar (${totalBongkar.toFixed(2)}) + Bajak (${totalBajak.toFixed(2)}) + SN (${totalSn.toFixed(2)}) + Tanam (${totalTanam.toFixed(2)})`,
              details: {
                bongkar: Math.round(totalBongkar * 100) / 100,
                bajak: Math.round(totalBajak * 100) / 100,
                sn: Math.round(totalSn * 100) / 100,
                tanam: Math.round(totalTanam * 100) / 100,
              },
            },
            stokBongkar: { value: latestItem.stokBongkar, formula: latestItem.stokBongkarFormula || '' },
            stokBajak: { value: latestItem.stokBajak, formula: latestItem.stokBajakFormula || '' },
            stokSN: { value: latestItem.stokSN, formula: latestItem.stokSNFormula || '' },
            totalStok: { value: latestItem.totalStok, formula: '' },
            monthlyBreakdown: breakdown,
            availableYears: AVAILABLE_STOK_YEARS,
            availableMonths: ALL_MONTH_NAMES,
          };
        }
      }
    }
    return getStokLahanSummary(internalYear, selectedMonths.length === 0 ? 'CURRENT' : internalMonthStr);
  }, [data?.stokLahanSummary, internalYear, internalMonthStr, selectedMonths, currentMonthName]);

  // Trigger button label like in Data Lahan
  // Badge pada kartu: jika default (kosong), tampilkan bulan berjalan otomatis (misal Okt-26)
  const cardMonthBadge = useMemo(() => {
    if (selectedMonths.length === 0) {
      return `${currentMonthName}-${String(internalYear).slice(2)}`;
    }
    if (selectedMonths.length === ALL_MONTH_NAMES.length) {
      return `Semua Bulan (${internalYear})`;
    }
    if (selectedMonths.length === 1) {
      return `${selectedMonths[0]}-${String(internalYear).slice(2)}`;
    }
    return `${selectedMonths[0]} - ${selectedMonths[selectedMonths.length - 1]}`;
  }, [selectedMonths, internalYear, currentMonthName]);

  const posisiLahanPeriodLabel = useMemo(() => {
    if (selectedMonths.length === 0 || selectedMonths.length === ALL_MONTH_NAMES.length) {
      return `Jan - Des ${internalYear}`;
    }
    if (selectedMonths.length === 1) {
      return `${selectedMonths[0]}-${String(internalYear).slice(2)}`;
    }
    return `${selectedMonths[0]} - ${selectedMonths[selectedMonths.length - 1]}`;
  }, [selectedMonths, internalYear]);

  // Perhitungan dinamis Target Rencana vs Realisasi (Opsi A) mengikuti filter bulan/tahun yang aktif
  const kpiFilterMonthNames = useMemo(() => {
    if (selectedMonths.length === 0) {
      return [currentMonthName]; // Default bulan berjalan, misal ['Okt']
    }
    if (selectedMonths.length === ALL_MONTH_NAMES.length) {
      return [...ALL_MONTH_NAMES];
    }
    return selectedMonths;
  }, [selectedMonths, currentMonthName]);

  const isAllMonthsSelected =
    kpiFilterMonthNames.length === ALL_MONTH_NAMES.length;

  // 1. KPI Bongkar: Target Rencana & Pencapaian
  const bongkarKpi = useMemo(() => {
    const list = (chartsData?.monthlyBongkar || []).filter(
      (item) => !item.year || item.year === internalYear
    );
    const filtered = list.filter((item) => {
      const mName = item.month?.split('-')[0] || '';
      return kpiFilterMonthNames.includes(mName);
    });

    const target = filtered.reduce((sum, item) => sum + (item.rencana || 0), 0);
    const realisasi = filtered.reduce((sum, item) => sum + (item.realisasi || 0), 0);

    // Fallback baseline resmi jika chartsData belum termuat
    const fallbackTarget = isAllMonthsSelected ? 1525.0 : 170.0;
    const fallbackReal = isAllMonthsSelected ? 1505.1 : 168.6;

    const finalTarget = target > 0 ? target : fallbackTarget;
    const finalReal = target > 0 ? realisasi : fallbackReal;
    const pct = finalTarget > 0 ? (finalReal / finalTarget) * 100 : 0;

    return {
      target: Math.round(finalTarget * 10) / 10,
      realisasi: Math.round(finalReal * 10) / 10,
      pct: Math.round(pct * 10) / 10,
    };
  }, [chartsData?.monthlyBongkar, internalYear, kpiFilterMonthNames, isAllMonthsSelected]);

  // 2. KPI Bajak: Target Rencana & Pencapaian
  const bajakKpi = useMemo(() => {
    const list = (chartsData?.monthlyBajak || []).filter(
      (item) => !item.year || item.year === internalYear
    );
    const filtered = list.filter((item) => {
      const mName = item.month?.split('-')[0] || '';
      return kpiFilterMonthNames.includes(mName);
    });

    const target = filtered.reduce((sum, item) => sum + (item.rencana || 0), 0);
    const realisasi = filtered.reduce((sum, item) => sum + (item.realisasi || 0), 0);

    // Fallback baseline resmi jika chartsData belum termuat
    const fallbackTarget = isAllMonthsSelected ? 2270.4 : 164.7;
    const fallbackReal = isAllMonthsSelected ? 1641.2 : 154.8;

    const finalTarget = target > 0 ? target : fallbackTarget;
    const finalReal = target > 0 ? realisasi : fallbackReal;
    const pct = finalTarget > 0 ? (finalReal / finalTarget) * 100 : 0;

    return {
      target: Math.round(finalTarget * 10) / 10,
      realisasi: Math.round(finalReal * 10) / 10,
      pct: Math.round(pct * 10) / 10,
    };
  }, [chartsData?.monthlyBajak, internalYear, kpiFilterMonthNames, isAllMonthsSelected]);

  // 3. KPI Siap Tanam: Target Rencana & Pencapaian
  const snKpi = useMemo(() => {
    const list = (chartsData?.monthlySiapTanam || []).filter(
      (item) => !item.year || item.year === internalYear
    );
    const filtered = list.filter((item) => {
      const mName = item.month?.split('-')[0] || '';
      return kpiFilterMonthNames.includes(mName);
    });

    const target = filtered.reduce((sum, item) => sum + (item.rencana || 0), 0);
    const realisasi = filtered.reduce((sum, item) => sum + (item.realisasi || 0), 0);

    // Fallback baseline resmi jika chartsData belum termuat
    const fallbackTarget = isAllMonthsSelected ? 1927.8 : 107.2;
    const fallbackReal = isAllMonthsSelected ? 1450.6 : 119.9;

    const finalTarget = target > 0 ? target : fallbackTarget;
    const finalReal = target > 0 ? realisasi : fallbackReal;
    const pct = finalTarget > 0 ? (finalReal / finalTarget) * 100 : 0;

    return {
      target: Math.round(finalTarget * 10) / 10,
      realisasi: Math.round(finalReal * 10) / 10,
      pct: Math.round(pct * 10) / 10,
    };
  }, [chartsData?.monthlySiapTanam, internalYear, kpiFilterMonthNames, isAllMonthsSelected]);

  if (!data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800"></div>
          <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. SUB MENU: PENGOLAHAN LAHAN (Urutan Opsi 1: Stok Bongkar & Stok Bajak Kompak di Kiri, Stok Siap Tanam Besar di Kanan) */}
      {(activeSubTab === 'pengolahan_lahan' || !activeSubTab) && (
        <div className="relative overflow-visible rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/90 dark:border-emerald-500/25 p-5 glass-panel shadow-xs transition-colors">
          {/* Top Header of Pengolahan Lahan with Year/Month Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Boxes className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  PENGOLAHAN LAHAN • STOK LAHAN 2026
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {/* Filter Popover Dropdown - Styled exactly like MultiSelectDropdown in Data Lahan */}
              <div ref={dropdownRef} className="relative inline-block">
                {/* Trigger Button */}
                <button
                  type="button"
                  id="filter-tahun-trigger"
                  onClick={() => setIsOpen(!isOpen)}
                  className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer select-none font-medium shadow-2xs ${
                    isFiltered
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500/25'
                      : 'bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-slate-400'
                  }`}
                  title={`Filter Tahun: ${
                    selectedMonths.length > 0
                      ? `${selectedMonths.length} dipilih`
                      : 'Klik untuk memilih'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-xs text-left truncate">
                      Tahun
                    </span>
                    {isFiltered && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </div>

                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 shrink-0 ${
                      isOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
                    }`}
                  />
                </button>

                {/* Popover Dropdown */}
                {isOpen && (
                  <div className="absolute top-full mt-1.5 right-0 z-50 w-[320px] sm:w-[480px] max-w-[94vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 text-xs animate-in fade-in zoom-in-95 duration-100 select-none ring-1 ring-black/5 dark:ring-white/10">
                    {/* Year Quick Filter Tabs */}
                    <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mr-1">Tahun:</span>
                      {AVAILABLE_STOK_YEARS.map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => handleSelectYear(yr)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                            internalYear === yr
                              ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {yr}
                        </button>
                      ))}
                    </div>

                    {/* Quick Actions (Pilih Semua / Reset) */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                      >
                        Pilih Semua ({ALL_MONTH_NAMES.length})
                      </button>
                      {isFiltered && (
                        <button
                          type="button"
                          onClick={handleReset}
                          className="text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer transition-colors"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    {/* Options Grid Layout */}
                    <div className="max-h-72 overflow-y-auto pr-1">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                        {ALL_MONTH_NAMES.map((m) => {
                          const isChecked = selectedMonths.includes(m);
                          return (
                            <label
                              key={m}
                              onClick={() => handleToggleMonth(m)}
                              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                                isChecked
                                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold shadow-2xs ring-1 ring-emerald-500/30'
                                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                              title={`${m} ${internalYear}`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                                  isChecked
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                }`}
                              >
                                {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                              <span className="flex-1 text-[11px] leading-snug whitespace-normal break-words text-left">
                                {m}-{String(internalYear).slice(2)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer Status */}
                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        {selectedMonths.length > 0 ? (
                          <span>
                            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {selectedMonths.length}
                            </strong>{' '}
                            dari {ALL_MONTH_NAMES.length} dipilih
                          </span>
                        ) : (
                          'Semua data ditampilkan'
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CARDS ROW (Opsi 1: Kiri 2 Card Kompak Bongkar & Bajak, Kanan Card Besar Siap Tanam SN) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
            {/* SISI KIRI (lg:col-span-6): 2 Card Kompak (Stok Bongkar & Stok Bajak) setara ukuran Real Tanam Bulanan & Proses Tanam */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CARD 1: STOK BONGKAR */}
              <div
                onMouseEnter={() => handleCardMouseEnter('BK')}
                onMouseLeave={handleCardMouseLeave}
                onClick={() => setHoveredCard((prev) => (prev === 'BK' ? null : 'BK'))}
                className={`relative overflow-visible rounded-2xl bg-white dark:bg-slate-950/80 border border-amber-300/80 dark:border-amber-500/30 p-5 glass-panel flex flex-col justify-between shadow-xs transition-all cursor-pointer hover:border-amber-400 dark:hover:border-amber-500/60 ${
                  hoveredCard === 'BK' ? 'z-40 ring-2 ring-amber-400/40 shadow-md' : 'z-10'
                }`}
              >
                <div className="flex items-center justify-between gap-2 h-7 mb-3">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider truncate flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    STOK BONGKAR
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 whitespace-nowrap shrink-0">
                    {cardMonthBadge}
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl lg:text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                      {(stokSummary?.stokBongkar?.value ?? 0).toLocaleString('id-ID', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-xs font-bold text-amber-600/80 dark:text-amber-400/80">Ha</span>
                  </div>

                  {/* Progress bar mini */}
                  <div className="mt-2.5">
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, bongkarKpi.pct))}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/60 text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">
                      Target:{' '}
                      <strong className="font-semibold text-slate-700 dark:text-slate-300">
                        {bongkarKpi.target.toLocaleString('id-ID', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{' '}
                        Ha
                      </strong>
                    </span>
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      Pencapaian: {bongkarKpi.pct}%
                    </span>
                  </div>
                </div>

                {/* Pop-up Hover Tabel Stok Bongkar */}
                {hoveredCard === 'BK' && (
                  <CardStockPopupTable
                    title="DAFTAR LOKASI STOK BONGKAR"
                    dateColumnHeader="REAL BONGKAR"
                    titleColorClass="text-amber-700 dark:text-amber-400"
                    data={previewCards?.BK}
                    selectedWilayah={selectedWilayah}
                    onMouseEnter={() => handleCardMouseEnter('BK')}
                    onMouseLeave={handleCardMouseLeave}
                    align="left"
                  />
                )}
              </div>

              {/* CARD 2: STOK BAJAK */}
              <div
                onMouseEnter={() => handleCardMouseEnter('BJK')}
                onMouseLeave={handleCardMouseLeave}
                onClick={() => setHoveredCard((prev) => (prev === 'BJK' ? null : 'BJK'))}
                className={`relative overflow-visible rounded-2xl bg-white dark:bg-slate-950/80 border border-blue-200 dark:border-blue-500/30 p-5 glass-panel flex flex-col justify-between shadow-xs transition-all cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/60 ${
                  hoveredCard === 'BJK' ? 'z-40 ring-2 ring-blue-400/40 shadow-md' : 'z-10'
                }`}
              >
                <div className="flex items-center justify-between gap-2 h-7 mb-3">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider truncate flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    STOK BAJAK
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap shrink-0">
                    {cardMonthBadge}
                  </span>
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl lg:text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                      {(stokSummary?.stokBajak?.value ?? 0).toLocaleString('id-ID', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-xs font-bold text-blue-600/80 dark:text-blue-400/80">Ha</span>
                  </div>

                  {/* Progress bar mini */}
                  <div className="mt-2.5">
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, bajakKpi.pct))}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/60 text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">
                      Target:{' '}
                      <strong className="font-semibold text-slate-700 dark:text-slate-300">
                        {bajakKpi.target.toLocaleString('id-ID', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{' '}
                        Ha
                      </strong>
                    </span>
                    <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                      Pencapaian: {bajakKpi.pct}%
                    </span>
                  </div>
                </div>

                {/* Pop-up Hover Tabel Stok Bajak */}
                {hoveredCard === 'BJK' && (
                  <CardStockPopupTable
                    title="DAFTAR LOKASI STOK BAJAK"
                    dateColumnHeader="REAL BAJAK"
                    titleColorClass="text-blue-700 dark:text-blue-400"
                    data={previewCards?.BJK}
                    selectedWilayah={selectedWilayah}
                    onMouseEnter={() => handleCardMouseEnter('BJK')}
                    onMouseLeave={handleCardMouseLeave}
                    align="right"
                  />
                )}
              </div>
            </div>

            {/* SISI KANAN (lg:col-span-6): Card Besar Stok Siap Tanam (SN) setara ukuran Card Realisasi Tanam */}
            <div
              onMouseEnter={() => handleCardMouseEnter('SN')}
              onMouseLeave={handleCardMouseLeave}
              onClick={() => setHoveredCard((prev) => (prev === 'SN' ? null : 'SN'))}
              className={`lg:col-span-6 relative overflow-visible rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300/80 dark:border-emerald-500/30 p-5 glass-panel flex flex-col justify-between shadow-xs transition-all cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500/60 ${
                hoveredCard === 'SN' ? 'z-40 ring-2 ring-emerald-400/40 shadow-md' : 'z-10'
              }`}
            >
              <div className="flex items-center justify-between gap-2 h-7 mb-3">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider truncate flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  STOK SIAP TANAM (SN)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap shrink-0">
                  {cardMonthBadge}
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl lg:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                    {(stokSummary?.stokSN?.value ?? 0).toLocaleString('id-ID', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-xs font-bold text-emerald-600/80 dark:text-emerald-400/80">Ha</span>
                </div>

                {/* Progress bar mini */}
                <div className="mt-2.5">
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, snKpi.pct))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/60">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Target:{' '}
                    <strong className="font-semibold text-slate-700 dark:text-slate-300">
                      {snKpi.target.toLocaleString('id-ID', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}{' '}
                      Ha
                    </strong>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Pencapaian: {snKpi.pct}%
                  </span>
                </div>
              </div>

              {/* Pop-up Hover Tabel Stok Siap Tanam */}
              {hoveredCard === 'SN' && (
                <CardStockPopupTable
                  title="DAFTAR LOKASI STOK SIAP TANAM"
                  dateColumnHeader="REAL SIAP TANAM"
                  titleColorClass="text-emerald-700 dark:text-emerald-400"
                  data={previewCards?.SN}
                  selectedWilayah={selectedWilayah}
                  onMouseEnter={() => handleCardMouseEnter('SN')}
                  onMouseLeave={handleCardMouseLeave}
                  align="right"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. SUB MENU: TANAM (Card Realisasi Tanam, Real Tanam Bulanan, dan Card Proses Tanam) */}
      {activeSubTab === 'tanam' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* CARD 1: REALISASI TANAM TAHUNAN (Kiri - Ukuran Asli 50% / lg:col-span-6) */}
          <div className="lg:col-span-6 relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-500/20 p-5 glass-panel flex flex-col justify-between shadow-xs transition-colors">
            <div className="flex items-center justify-between gap-2 h-7 mb-3">
              <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider truncate block">
                REALISASI TANAM
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 whitespace-nowrap shrink-0">
                {data.realisasiTanamSummary?.periodLabel || 'Jan - Sep 2026'}
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {(
                    data.realisasiTanamSummary?.nilaiHa ??
                    data.totalRealisasiHa
                  ).toLocaleString('id-ID', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Ha</span>
              </div>

              {/* Progress bar mini */}
              {data.realisasiTanamSummary && (
                <div className="mt-2.5">
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, data.realisasiTanamSummary.pencapaianPct)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/60">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Target 2026:{' '}
                  <strong className="font-semibold text-slate-700 dark:text-slate-300">
                    {(data.realisasiTanamSummary?.targetFullYearHa ?? 1399.5).toLocaleString('id-ID', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    Ha
                  </strong>
                </span>
                <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                  Pencapaian: {data.realisasiTanamSummary?.pencapaianPct ?? 74.9}%
                </span>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: REAL TANAM BULANAN & PROSES TANAM (lg:col-span-6) */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SUB-KARTU 1: REAL TANAM BULANAN */}
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/20 p-5 glass-panel flex flex-col justify-between shadow-xs transition-colors">
              <div className="flex items-center justify-between gap-2 h-7 mb-3">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider truncate block">
                  REAL TANAM BULANAN
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap shrink-0">
                  {data.realisasiTanamMtdSummary?.periodLabel || '1 - 13 Okt 2026'}
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl lg:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                    {(data.realisasiTanamMtdSummary?.nilaiHa ?? 51.15).toLocaleString('id-ID', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Ha</span>
                </div>

                {/* Progress bar mini MTD terhadap target bulan */}
                <div className="mt-2.5">
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, data.realisasiTanamMtdSummary?.pencapaianPct ?? 39.3)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/60">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Target Okt:{' '}
                    <strong className="font-semibold text-slate-700 dark:text-slate-300">
                      {(data.realisasiTanamMtdSummary?.targetBulanHa ?? 130.0).toLocaleString('id-ID', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}{' '}
                      Ha
                    </strong>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Pencapaian: {data.realisasiTanamMtdSummary?.pencapaianPct ?? 39.3}%
                  </span>
                </div>
              </div>
            </div>

            {/* SUB-KARTU 2: PROSES TANAM */}
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/20 p-5 glass-panel flex flex-col justify-between shadow-xs transition-colors">
              <div className="flex items-center justify-between gap-2 h-7 mb-3">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider truncate block">
                  PROSES TANAM
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 whitespace-nowrap shrink-0">
                  {data.prosesTanamSummary?.prosesCount ?? 10} Lokasi
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl lg:text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                    {(data.prosesTanamSummary?.prosesHa ?? 22.24).toLocaleString('id-ID', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Ha</span>
                </div>

                {/* Spacer bar agar tinggi dan margin kartu persis sejajar */}
                <div className="mt-2.5 h-1.5" />

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/60">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Selesai:{' '}
                    <strong className="font-semibold text-slate-700 dark:text-slate-300">
                      {(data.prosesTanamSummary?.selesaiHa ?? 2524.28).toLocaleString('id-ID', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}{' '}
                      Ha
                    </strong>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {data.prosesTanamSummary?.selesaiCount ?? 353} Selesai
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

