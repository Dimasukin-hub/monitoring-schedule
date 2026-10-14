'use client';

import React, { useState, useMemo, useEffect, useDeferredValue, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  Rectangle,
} from 'recharts';
import {
  TrendingUp,
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Award,
  Check,
  X,
  BarChart3,
  Table,
  Info,
  Boxes,
  Sparkles,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import WilayahFilterDropdown from './WilayahFilterDropdown';
import MonthMultiFilterDropdown from './MonthMultiFilterDropdown';

export interface ChartsDataProps {
  monthlyBongkar?: Array<{
    month: string;
    year?: number;
    monthIndex?: number;
    rfc: number;
    rencana: number;
    realisasi: number;
    deviasi: number;
    akumulasi: number;
  }>;
  monthlyBajak?: Array<{
    month: string;
    year?: number;
    monthIndex?: number;
    rfc: number;
    rencana: number;
    realisasi: number;
    deviasi: number;
    akumulasi: number;
  }>;
  monthlySiapTanam?: Array<{
    month: string;
    year?: number;
    monthIndex?: number;
    rfc: number;
    rencana: number;
    realisasi: number;
    deviasi: number;
    akumulasi: number;
  }>;
  monthlyTanam?: Array<{
    month: string;
    year?: number;
    monthIndex?: number;
    rfc: number;
    rencana: number;
    realisasi: number | null;
    deviasi: number | null;
  }>;
  yearlyBongkar?: Array<{
    year: string;
    rfc: number;
    rencana: number;
    realisasi: number;
    deviasi: number;
  }>;
  yearlyBajak?: Array<{
    year: string;
    rfc: number;
    rencana: number;
    realisasi: number;
    deviasi: number;
  }>;
  yearlySiapTanam?: Array<{
    year: string;
    rfc: number;
    rencana: number;
    realisasi: number;
    deviasi: number;
  }>;
  yearlyTanam?: Array<{
    year: string;
    rfc: number;
    rencana: number;
    realisasi: number;
    deviasi: number;
  }>;
  dailyBongkar?: Array<{
    periodKey: string;
    rawDate: string;
    monthKey: string;
    rencana: number;
    realisasi: number;
    deviasi: number;
  }>;
  weeklyBongkar?: Array<{
    periodKey: string;
    rawWeek: string;
    rencana: number;
    realisasi: number;
    deviasi: number;
  }>;
  dailyBajak?: Array<{
    periodKey: string;
    rawDate: string;
    monthKey: string;
    rencana: number;
    realisasi: number;
    deviasi: number;
  }>;
  weeklyBajak?: Array<{
    periodKey: string;
    rawWeek: string;
    rencana: number;
    realisasi: number;
    deviasi: number;
  }>;
  dailySiapTanam?: Array<{
    periodKey: string;
    rawDate: string;
    monthKey: string;
    rencana: number;
    realisasi: number;
    deviasi: number;
  }>;
  weeklySiapTanam?: Array<{
    periodKey: string;
    rawWeek: string;
    rencana: number;
    realisasi: number;
    deviasi: number;
  }>;
  wilayahPositions: Array<{
    wilayah: string;
    bkCount: number;
    bkLuas?: number;
    bkLocations: string[];
    bjkCount: number;
    bjkLuas?: number;
    bjkLocations: string[];
    snCount: number;
    snLuas?: number;
    snLocations: string[];
    prosesCount: number;
    prosesLuas?: number;
    prosesLocations: string[];
    selesaiCount: number;
    selesaiLuas?: number;
    selesaiLocations: string[];
  }>;
  activityFunnel?: Array<{
    code: string;
    name: string;
    stepOrder: number;
    completed: number;
    inProgress: number;
    pending: number;
    total: number;
    completionRate: number;
  }>;
  seedSummaries?: Array<{
    type: string;
    kelas: string;
    kebutuhan: number;
    potensi: number;
    realisasi: number;
    deviasi: number;
  }>;
  monthlyWilayahPositions?: Record<
    string,
    Array<{
      wilayah: string;
      bkCount?: number;
      bkLuas: number;
      bkLocations: string[];
      bjkCount?: number;
      bjkLuas: number;
      bjkLocations: string[];
      snCount?: number;
      snLuas: number;
      snLocations: string[];
    }>
  >;
}

export interface CommonChartProps {
  chartsData: ChartsDataProps | null;
  onSelectLand?: (lokasi: string) => void;
  selectedWilayah?: string;
  setSelectedWilayah?: (wilayah: string) => void;
  availableWilayahs?: string[];
}

export interface PosisiLahanProps extends CommonChartProps {
  activeStage?: 'BK' | 'BJK' | 'SN' | 'ALL';
  onStageChange?: (stage: 'BK' | 'BJK' | 'SN' | 'ALL') => void;
  onClose?: () => void;
  showStageSwitcher?: boolean;
  periodLabel?: string;
  selectedMonths?: string[];
  setSelectedMonths?: (months: string[]) => void;
}

// =========================================================================
// 1. POSISI LAHAN PER WILAYAH (BK, BJK, SN)
//    Warna batang dinamis berdasar ketinggian nilai (Tinggi -> Rendah)
// =========================================================================
export function PosisiLahanSection({
  chartsData,
  onSelectLand,
  selectedWilayah,
  setSelectedWilayah,
  availableWilayahs,
  activeStage = 'ALL',
  onStageChange,
  onClose,
  showStageSwitcher = true,
  periodLabel,
  selectedMonths: propSelectedMonths,
  setSelectedMonths: propSetSelectedMonths,
}: PosisiLahanProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // State multi-filter bulan lokal untuk Posisi Lahan (default: kosong yang berarti semua bulan Jan - Des 26)
  const [internalSelectedMonths, setInternalSelectedMonths] = useState<string[]>([]);
  const effectiveSelectedMonths = propSelectedMonths !== undefined ? propSelectedMonths : internalSelectedMonths;
  const setEffectiveSelectedMonths = propSetSelectedMonths || setInternalSelectedMonths;

  if (!chartsData || !chartsData.wilayahPositions) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800"></div>
        ))}
      </div>
    );
  }

  // 7 Wilayah operasional resmi: W01 s/d W07
  const officialWilayahs = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07'];

  const normalizeW = (w: string) => {
    const clean = (w || '').trim().toUpperCase();
    if (clean === 'ARS1') return 'W07';
    if (clean === 'SAG1' || clean === 'MD2') return 'W04';
    if (clean.startsWith('AW0')) return 'W0' + clean.slice(3);
    if (clean.startsWith('AW')) {
      const num = clean.slice(2);
      return num.length === 1 ? `W0${num}` : `W${num}`;
    }
    return clean;
  };

  // Agregasi defensif agar hanya 7 wilayah resmi (W01 s/d W07) yang ditampilkan di sumbu X
  // Menggunakan monthlyWilayahPositions jika ada filter multi-bulan aktif
  const aggregateByWilayah = (
    stageKey: 'bkLuas' | 'bjkLuas' | 'snLuas',
    locKey: 'bkLocations' | 'bjkLocations' | 'snLocations'
  ) => {
    const map: Record<string, { wilayah: string; luas: number; locations: string[] }> = {};
    for (const w of officialWilayahs) {
      map[w] = { wilayah: w, luas: 0, locations: [] };
    }

    const isFilteredMonths = effectiveSelectedMonths.length > 0 && effectiveSelectedMonths.length < 12;

    if (isFilteredMonths && chartsData.monthlyWilayahPositions) {
      for (const m of effectiveSelectedMonths) {
        const mItems = chartsData.monthlyWilayahPositions[m] || [];
        for (const item of mItems) {
          const norm = normalizeW(item.wilayah);
          if (!map[norm]) {
            map[norm] = { wilayah: norm, luas: 0, locations: [] };
          }
          map[norm].luas += (item as any)[stageKey] || 0;
          const locs = (item as any)[locKey] || [];
          map[norm].locations.push(...locs);
        }
      }
    } else {
      for (const item of chartsData.wilayahPositions) {
        const norm = normalizeW(item.wilayah);
        if (!map[norm]) {
          map[norm] = { wilayah: norm, luas: 0, locations: [] };
        }
        map[norm].luas += (item as any)[stageKey] || 0;
        const locs = (item as any)[locKey] || [];
        map[norm].locations.push(...locs);
      }
    }

    return officialWilayahs.map((w) => ({
      wilayah: w,
      luas: Math.round(map[w].luas * 100) / 100,
      locations: Array.from(new Set(map[w].locations)),
    }));
  };

  const sortedBK = useMemo(() => aggregateByWilayah('bkLuas', 'bkLocations'), [chartsData, effectiveSelectedMonths]);
  const sortedBJK = useMemo(() => aggregateByWilayah('bjkLuas', 'bjkLocations'), [chartsData, effectiveSelectedMonths]);
  const sortedSN = useMemo(() => aggregateByWilayah('snLuas', 'snLocations'), [chartsData, effectiveSelectedMonths]);

  const selectedWilayahList = useMemo(() => {
    if (!selectedWilayah || selectedWilayah === 'ALL') return null;
    return selectedWilayah.split(',').map((w) => w.trim()).filter(Boolean);
  }, [selectedWilayah]);

  const displayBK = useMemo(() => {
    if (!selectedWilayahList || selectedWilayahList.length === 0) return sortedBK;
    return sortedBK.filter((w) => selectedWilayahList.includes(w.wilayah));
  }, [sortedBK, selectedWilayahList]);

  const displayBJK = useMemo(() => {
    if (!selectedWilayahList || selectedWilayahList.length === 0) return sortedBJK;
    return sortedBJK.filter((w) => selectedWilayahList.includes(w.wilayah));
  }, [sortedBJK, selectedWilayahList]);

  const displaySN = useMemo(() => {
    if (!selectedWilayahList || selectedWilayahList.length === 0) return sortedSN;
    return sortedSN.filter((w) => selectedWilayahList.includes(w.wilayah));
  }, [sortedSN, selectedWilayahList]);

  const maxBK = Math.max(...displayBK.map((w) => w.luas), 1);
  const maxBJK = Math.max(...displayBJK.map((w) => w.luas), 1);
  const maxSN = Math.max(...displaySN.map((w) => w.luas), 1);

  // Cari wilayah dengan luas tertinggi untuk ditampilkan pada label ringkasan
  const highestBK = [...displayBK].sort((a, b) => b.luas - a.luas)[0];
  const highestBJK = [...displayBJK].sort((a, b) => b.luas - a.luas)[0];
  const highestSN = [...displaySN].sort((a, b) => b.luas - a.luas)[0];

  // Helper untuk ranking
  const getRankMap = (list: typeof sortedBK) => {
    const sortedByLuas = [...list].sort((a, b) => b.luas - a.luas);
    return new Map(sortedByLuas.map((item, idx) => [item.wilayah, idx + 1]));
  };

  const rankMapBK = getRankMap(displayBK);
  const rankMapBJK = getRankMap(displayBJK);
  const rankMapSN = getRankMap(displaySN);

  // Dynamic bar coloring based on height/value relative to maximum (GGF Logo Palette)
  const getDynamicHeightColor = (val: number, maxVal: number) => {
    const ratio = maxVal > 0 ? val / maxVal : 0;
    if (ratio >= 0.75) {
      return {
        fill: isDark ? '#00A84C' : '#00873D', // GGF Corporate Green
        tier: 'Tinggi',
        colorBadge: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30',
      };
    } else if (ratio >= 0.50) {
      return {
        fill: isDark ? '#92CF2C' : '#84BD00', // GGF Leaf Green
        tier: 'Sedang-Tinggi',
        colorBadge: 'bg-lime-500/15 text-lime-900 dark:text-lime-300 border border-lime-500/30',
      };
    } else if (ratio >= 0.30) {
      return {
        fill: isDark ? '#00B0FA' : '#009EE2', // GGF Droplet Blue
        tier: 'Sedang',
        colorBadge: 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30',
      };
    } else if (ratio >= 0.15) {
      return {
        fill: isDark ? '#FA963C' : '#F58220', // GGF Warm Orange
        tier: 'Sedang-Rendah',
        colorBadge: 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30',
      };
    } else {
      return {
        fill: isDark ? '#F43F5E' : '#E11D48', // Coral Rose
        tier: 'Rendah',
        colorBadge: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30',
      };
    }
  };

  // Custom Interactive Tooltip
  const CustomWilayahRankTooltip = ({
    active,
    payload,
    label,
    title,
    maxVal,
  }: any) => {
    if (active && payload && payload.length) {
      const payloadData = payload[0]?.payload;
      const locations: string[] = payloadData?.locations || [];
      const luas = payload[0]?.value ?? 0;
      const rank = payloadData?.rank ?? 1;
      const heightInfo = getDynamicHeightColor(luas, maxVal);

      return (
        <div className="p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl text-xs max-w-xs backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 font-mono text-sm">
              <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Wilayah {label}
            </span>
            <div className="flex items-center gap-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${heightInfo.colorBadge}`}>
                {heightInfo.tier}
              </span>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                #{rank}
              </span>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">{title}:</span>
            <strong className="text-slate-900 dark:text-slate-100 font-extrabold text-sm">
              {Number(luas).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ha
            </strong>
          </div>

          {locations.length > 0 && (
            <div>
              <span className="text-slate-600 dark:text-slate-400 text-[10px] block mb-1 font-semibold">
                Daftar Lokasi ({locations.length} lokasi):
              </span>
              <div className="max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1">
                {locations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => onSelectLand && onSelectLand(loc)}
                    className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500 hover:text-white dark:hover:text-slate-950 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700/80 transition-all cursor-pointer"
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const [selectedStage, setSelectedStage] = useState<'BK' | 'BJK' | 'SN' | 'ALL'>(activeStage || 'ALL');

  useEffect(() => {
    if (activeStage) {
      setSelectedStage(activeStage);
    }
  }, [activeStage]);

  const handleStageChange = (st: 'BK' | 'BJK' | 'SN' | 'ALL') => {
    setSelectedStage(st);
    onStageChange?.(st);
  };

  const totalLuasBK = useMemo(() => Math.round(displayBK.reduce((acc, curr) => acc + curr.luas, 0) * 100) / 100, [displayBK]);
  const totalLuasBJK = useMemo(() => Math.round(displayBJK.reduce((acc, curr) => acc + curr.luas, 0) * 100) / 100, [displayBJK]);
  const totalLuasSN = useMemo(() => Math.round(displaySN.reduce((acc, curr) => acc + curr.luas, 0) * 100) / 100, [displaySN]);

  const activePeriodLabel = useMemo(() => {
    if (effectiveSelectedMonths.length === 0 || effectiveSelectedMonths.length === 12) {
      return 'Jan - Des 2026';
    }
    if (effectiveSelectedMonths.length === 1) {
      return `${effectiveSelectedMonths[0]}-26`;
    }
    if (effectiveSelectedMonths.length <= 3) {
      return `${effectiveSelectedMonths.join(', ')} 2026`;
    }
    return `${effectiveSelectedMonths.length} Bulan (${effectiveSelectedMonths[0]}..${effectiveSelectedMonths[effectiveSelectedMonths.length - 1]})`;
  }, [effectiveSelectedMonths]);

  const stageHeaderInfo = useMemo(() => {
    const periodSuffix = ` • Periode: ${activePeriodLabel}`;
    switch (selectedStage) {
      case 'BK':
        return {
          title: `Posisi Lahan BK per Wilayah (Bongkar)`,
          subtitle: `Monitoring sebaran luas lahan tahapan Bongkar di 7 wilayah operasional (Total: ${totalLuasBK.toFixed(2)} Ha • Tertinggi: Wilayah ${highestBK?.wilayah || '-'}${periodSuffix})`,
          icon: <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        };
      case 'BJK':
        return {
          title: `Posisi Lahan BJK per Wilayah (Bajak)`,
          subtitle: `Monitoring sebaran luas lahan tahapan Bajak di 7 wilayah operasional (Total: ${totalLuasBJK.toFixed(2)} Ha • Tertinggi: Wilayah ${highestBJK?.wilayah || '-'}${periodSuffix})`,
          icon: <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
        };
      case 'SN':
        return {
          title: `Posisi Lahan SN per Wilayah (Siap Tanam)`,
          subtitle: `Monitoring sebaran luas lahan tahapan Siap Tanam di 7 wilayah operasional (Total: ${totalLuasSN.toFixed(2)} Ha • Tertinggi: Wilayah ${highestSN?.wilayah || '-'}${periodSuffix})`,
          icon: <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
        };
      default:
        return {
          title: `Posisi Lahan per Wilayah (BK, BJK, SN)`,
          subtitle: `Monitoring sebaran luas lahan per wilayah operasional (Bongkar, Bajak, Siap Tanam${periodSuffix})`,
          icon: <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
        };
    }
  }, [selectedStage, activePeriodLabel, totalLuasBK, totalLuasBJK, totalLuasSN, highestBK, highestBJK, highestSN]);

  const renderBKChart = (isSingle: boolean = false) => (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 glass-panel shadow-xs transition-colors ${isSingle ? 'h-full' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Boxes className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Posisi Lahan BK per Wilayah
          </h4>
          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
            Tertinggi: <strong className="text-slate-900 dark:text-slate-200 font-bold">{highestBK?.wilayah || '-'}</strong> ({highestBK ? highestBK.luas.toFixed(1) : '0'} Ha)
          </span>
        </div>
        <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
          Bongkar
        </span>
      </div>

      <div className={`${isSingle ? 'h-64 sm:h-72' : 'h-60'} w-full outline-none focus:outline-none select-none`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayBK.map((item) => ({ ...item, rank: rankMapBK.get(item.wilayah) || 1 }))}
            margin={{ top: 10, right: 10, left: -20, bottom: 8 }}
            className="outline-none focus:outline-none"
          >
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} vertical={false} />
            <XAxis
              dataKey="wilayah"
              stroke={isDark ? '#475569' : '#cbd5e1'}
              tickLine={false}
              interval={0}
              dy={6}
              tick={{ fill: isDark ? '#f1f5f9' : '#0f172a', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}
            />
            <YAxis
              stroke={isDark ? '#475569' : '#cbd5e1'}
              tickLine={false}
              tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 10, fontWeight: 600 }}
            />
            <Tooltip
              content={
                <CustomWilayahRankTooltip
                  title="Luas Bongkar (BK)"
                  maxVal={maxBK}
                />
              }
            />
            <Bar dataKey="luas" name="Luas BK (Ha)" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {displayBK.map((entry, index) => {
                const colorInfo = getDynamicHeightColor(entry.luas, maxBK);
                return (
                  <Cell
                    key={`cell-bk-${index}`}
                    fill={colorInfo.fill}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderBJKChart = (isSingle: boolean = false) => (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 glass-panel shadow-xs transition-colors ${isSingle ? 'h-full' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-xs font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Posisi Lahan BJK per Wilayah
          </h4>
          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
            Tertinggi: <strong className="text-slate-900 dark:text-slate-200 font-bold">{highestBJK?.wilayah || '-'}</strong> ({highestBJK ? highestBJK.luas.toFixed(1) : '0'} Ha)
          </span>
        </div>
        <span className="text-[10px] text-blue-800 dark:text-blue-300 font-bold bg-blue-500/15 px-2 py-0.5 rounded border border-blue-500/30">
          Bajak
        </span>
      </div>

      <div className={`${isSingle ? 'h-64 sm:h-72' : 'h-60'} w-full outline-none focus:outline-none select-none`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayBJK.map((item) => ({ ...item, rank: rankMapBJK.get(item.wilayah) || 1 }))}
            margin={{ top: 10, right: 10, left: -20, bottom: 8 }}
            className="outline-none focus:outline-none"
          >
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} vertical={false} />
            <XAxis
              dataKey="wilayah"
              stroke={isDark ? '#475569' : '#cbd5e1'}
              tickLine={false}
              interval={0}
              dy={6}
              tick={{ fill: isDark ? '#f1f5f9' : '#0f172a', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}
            />
            <YAxis
              stroke={isDark ? '#475569' : '#cbd5e1'}
              tickLine={false}
              tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 10, fontWeight: 600 }}
            />
            <Tooltip
              content={
                <CustomWilayahRankTooltip
                  title="Luas Bajak (BJK)"
                  maxVal={maxBJK}
                />
              }
            />
            <Bar dataKey="luas" name="Luas BJK (Ha)" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {displayBJK.map((entry, index) => {
                const colorInfo = getDynamicHeightColor(entry.luas, maxBJK);
                return (
                  <Cell
                    key={`cell-bjk-${index}`}
                    fill={colorInfo.fill}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderSNChart = (isSingle: boolean = false) => (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 glass-panel shadow-xs transition-colors ${isSingle ? 'h-full' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Posisi Lahan SN per Wilayah
          </h4>
          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
            Tertinggi: <strong className="text-slate-900 dark:text-slate-200 font-bold">{highestSN?.wilayah || '-'}</strong> ({highestSN ? highestSN.luas.toFixed(1) : '0'} Ha)
          </span>
        </div>
        <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
          Siap Tanam
        </span>
      </div>

      <div className={`${isSingle ? 'h-64 sm:h-72' : 'h-60'} w-full outline-none focus:outline-none select-none`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displaySN.map((item) => ({ ...item, rank: rankMapSN.get(item.wilayah) || 1 }))}
            margin={{ top: 10, right: 10, left: -20, bottom: 8 }}
            className="outline-none focus:outline-none"
          >
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} vertical={false} />
            <XAxis
              dataKey="wilayah"
              stroke={isDark ? '#475569' : '#cbd5e1'}
              tickLine={false}
              interval={0}
              dy={6}
              tick={{ fill: isDark ? '#f1f5f9' : '#0f172a', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}
            />
            <YAxis
              stroke={isDark ? '#475569' : '#cbd5e1'}
              tickLine={false}
              tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 10, fontWeight: 600 }}
            />
            <Tooltip
              content={
                <CustomWilayahRankTooltip
                  title="Luas Siap Tanam (SN)"
                  maxVal={maxSN}
                />
              }
            />
            <Bar dataKey="luas" name="Luas SN (Ha)" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {displaySN.map((entry, index) => {
                const colorInfo = getDynamicHeightColor(entry.luas, maxSN);
                return (
                  <Cell
                    key={`cell-sn-${index}`}
                    fill={colorInfo.fill}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderWilayahBreakdownPanel = (
    list: typeof sortedBK,
    totalLuas: number,
    stageTitle: string,
    badgeClass: string
  ) => {
    // Urutan wilayah dibuat mulai dari W01 sampai W07 sesuai permintaan
    const sortedByWilayah = [...list].sort((a, b) => a.wilayah.localeCompare(b.wilayah));
    const barColor = stageTitle.includes('BK')
      ? 'bg-amber-500'
      : stageTitle.includes('BJK')
      ? 'bg-blue-600'
      : 'bg-emerald-500';

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 glass-panel shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Rincian Wilayah {stageTitle} ({activePeriodLabel})
              </h5>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Rincian luas lahan per wilayah operasional (W01 - W07)
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeClass}`}>
              Total: {totalLuas.toFixed(2)} Ha
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {sortedByWilayah.map((item, idx) => {
              const pct = totalLuas > 0 ? (item.luas / totalLuas) * 100 : 0;
              return (
                <div
                  key={item.wilayah}
                  className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] flex items-center justify-center font-sans font-bold text-slate-700 dark:text-slate-300">
                        {idx + 1}
                      </span>
                      <span>Wilayah {item.wilayah}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 font-mono">
                        {item.luas.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">Ha</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 ml-1 font-mono">
                        ({pct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* Mini progress bar */}
                  <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  {item.locations.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                      <span className="text-[9px] text-slate-400 font-medium">Lokasi:</span>
                      {item.locations.slice(0, 4).map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => onSelectLand && onSelectLand(loc)}
                          className="text-[9px] font-mono px-1 py-0.2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-600 hover:border-emerald-400 cursor-pointer"
                        >
                          {loc}
                        </button>
                      ))}
                      {item.locations.length > 4 && (
                        <span className="text-[9px] text-slate-400 font-mono">
                          +{item.locations.length - 4} lagi
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {stageHeaderInfo.icon}
            {stageHeaderInfo.title}
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {stageHeaderInfo.subtitle}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Stage Switcher Pills */}
          {showStageSwitcher && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => handleStageChange('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  selectedStage === 'ALL'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => handleStageChange('BK')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  selectedStage === 'BK'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Bongkar (BK)
              </button>
              <button
                type="button"
                onClick={() => handleStageChange('BJK')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  selectedStage === 'BJK'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Bajak (BJK)
              </button>
              <button
                type="button"
                onClick={() => handleStageChange('SN')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  selectedStage === 'SN'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Siap Tanam (SN)
              </button>
            </div>
          )}

          {/* Multi-Filter Bulan (Jan - Des 26) */}
          <MonthMultiFilterDropdown
            selectedMonths={effectiveSelectedMonths}
            setSelectedMonths={setEffectiveSelectedMonths}
          />

          {setSelectedWilayah && (
            <div className="flex items-center gap-2">
              <WilayahFilterDropdown
                selectedWilayah={selectedWilayah}
                setSelectedWilayah={setSelectedWilayah}
                availableWilayahs={availableWilayahs || officialWilayahs}
              />
            </div>
          )}
        </div>
      </div>

      {/* Render Chart Content based on selectedStage */}
      {selectedStage === 'BK' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-200">
          <div className="lg:col-span-8">{renderBKChart(true)}</div>
          <div className="lg:col-span-4">{renderWilayahBreakdownPanel(displayBK, totalLuasBK, 'Bongkar (BK)', 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30')}</div>
        </div>
      )}

      {selectedStage === 'BJK' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-200">
          <div className="lg:col-span-8">{renderBJKChart(true)}</div>
          <div className="lg:col-span-4">{renderWilayahBreakdownPanel(displayBJK, totalLuasBJK, 'Bajak (BJK)', 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30')}</div>
        </div>
      )}

      {selectedStage === 'SN' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-200">
          <div className="lg:col-span-8">{renderSNChart(true)}</div>
          <div className="lg:col-span-4">{renderWilayahBreakdownPanel(displaySN, totalLuasSN, 'Siap Tanam (SN)', 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30')}</div>
        </div>
      )}

      {selectedStage === 'ALL' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {renderBKChart(false)}
          {renderBJKChart(false)}
          {renderSNChart(false)}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 2. RENCANA VS REALISASI (HA)
//    Urutan kategori: Bongkar, Bajak, Siap Tanam
// =========================================================================
const MONTH_NAMES_LIST = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function RencanaRealisasiSection({ chartsData }: CommonChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [targetCategory, setTargetCategory] = useState<'BONGKAR' | 'BAJAK' | 'SIAP_TANAM'>('BONGKAR');
  const [periodMode, setPeriodMode] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  // Default weekly: 9 minggu realisasi terakhir (Mgg 32) s/d minggu saat ini (Mgg 40) + 3 minggu forecast (Mgg 43)
  const [weeklyRange, setWeeklyRange] = useState<[number, number]>([32, 43]);
  // Default monthly: 1 Tahun Penuh (Januari s/d Desember 2026)
  const [monthlyRange, setMonthlyRange] = useState<[number, number]>([1, 12]);
  // Default daily: Range index yang disinkronkan ke bulan berjalan (Okt-26)
  const [dailyRange, setDailyRange] = useState<[number, number]>([0, 0]);
  // Filter visibilitas bar: 'both' (kedua bar), 'rencana' (hanya rencana), 'realisasi' (hanya realisasi)
  const [barVisibility, setBarVisibility] = useState<'both' | 'rencana' | 'realisasi'>('both');

  const handleBarToggle = (type: 'rencana' | 'realisasi') => {
    setBarVisibility((prev) => (prev === type ? 'both' : type));
  };

  // Defer range values for heavy chart data mapping and SVG rendering so slider thumb drags smoothly without UI locks
  const deferredWeeklyRange = useDeferredValue(weeklyRange);
  const deferredMonthlyRange = useDeferredValue(monthlyRange);
  const deferredDailyRange = useDeferredValue(dailyRange);

  const dailyRangeRef = useRef(dailyRange);
  dailyRangeRef.current = dailyRange;

  const weeklyRangeRef = useRef(weeklyRange);
  weeklyRangeRef.current = weeklyRange;

  const monthlyRangeRef = useRef(monthlyRange);
  monthlyRangeRef.current = monthlyRange;

  // Generic drag & click handler untuk garis filter volume/periode (klik/geser di titik manapun langsung memilih)
  const createTrackPointerDownHandler = (
    minLimit: number,
    maxLimit: number,
    getRange: () => [number, number],
    setRange: (updater: (prev: [number, number]) => [number, number]) => void
  ) => {
    return (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      e.preventDefault();

      const rect = e.currentTarget.getBoundingClientRect();
      if (!rect.width || maxLimit <= minLimit) return;

      const calcValueFromX = (clientX: number) => {
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return Math.round(minLimit + ratio * (maxLimit - minLimit));
      };

      const initialVal = calcValueFromX(e.clientX);
      const current = getRange();

      let targetHandle: 'start' | 'end';
      if (initialVal < current[0]) {
        targetHandle = 'start';
      } else if (initialVal > current[1]) {
        targetHandle = 'end';
      } else {
        const distStart = Math.abs(initialVal - current[0]);
        const distEnd = Math.abs(current[1] - initialVal);
        targetHandle = distStart <= distEnd ? 'start' : 'end';
      }

      setRange((prev) => {
        if (targetHandle === 'start') {
          const nextVal = Math.max(minLimit, Math.min(initialVal, prev[1]));
          if (prev[0] === nextVal) return prev;
          return [nextVal, prev[1]];
        } else {
          const nextVal = Math.min(maxLimit, Math.max(initialVal, prev[0]));
          if (prev[1] === nextVal) return prev;
          return [prev[0], nextVal];
        }
      });

      const onPointerMove = (moveEvent: PointerEvent) => {
        const moveVal = calcValueFromX(moveEvent.clientX);
        setRange((prev) => {
          if (targetHandle === 'start') {
            const nextVal = Math.max(minLimit, Math.min(moveVal, prev[1]));
            if (prev[0] === nextVal) return prev;
            return [nextVal, prev[1]];
          } else {
            const nextVal = Math.min(maxLimit, Math.max(moveVal, prev[0]));
            if (prev[1] === nextVal) return prev;
            return [prev[0], nextVal];
          }
        });
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    };
  };

  // All daily items for the active category in 2026
  const allDailyItems = useMemo(() => {
    let source: any[] = [];
    if (targetCategory === 'BONGKAR') source = chartsData?.dailyBongkar || [];
    else if (targetCategory === 'BAJAK') source = chartsData?.dailyBajak || [];
    else source = chartsData?.dailySiapTanam || [];
    return source;
  }, [chartsData, targetCategory]);

  const handleDailyTrackPointerDown = useMemo(() => {
    return createTrackPointerDownHandler(
      0,
      Math.max(1, allDailyItems.length - 1),
      () => dailyRangeRef.current,
      setDailyRange
    );
  }, [allDailyItems.length]);

  const handleWeeklyTrackPointerDown = useMemo(() => {
    return createTrackPointerDownHandler(
      1,
      52,
      () => weeklyRangeRef.current,
      setWeeklyRange
    );
  }, []);

  const handleMonthlyTrackPointerDown = useMemo(() => {
    return createTrackPointerDownHandler(
      1,
      12,
      () => monthlyRangeRef.current,
      setMonthlyRange
    );
  }, []);

  // Sinkronisasi otomatis default range Harian ke Bulan Berjalan (Okt-26) atau bulan terakhir yang ada data
  const resetDailyToOctober = () => {
    if (allDailyItems.length > 0) {
      let start = -1;
      let end = -1;
      allDailyItems.forEach((item, idx) => {
        if (item.monthKey === 'Okt-26') {
          if (start === -1) start = idx;
          end = idx;
        }
      });
      if (start === -1 || end === -1) {
        const lastMonth = allDailyItems[allDailyItems.length - 1]?.monthKey;
        allDailyItems.forEach((item, idx) => {
          if (item.monthKey === lastMonth) {
            if (start === -1) start = idx;
            end = idx;
          }
        });
      }
      const targetStart = start !== -1 ? start : 0;
      const targetEnd = end !== -1 ? end : Math.max(0, allDailyItems.length - 1);
      setDailyRange((prev) => {
        if (prev[0] === targetStart && prev[1] === targetEnd) return prev;
        return [targetStart, targetEnd];
      });
    }
  };

  useEffect(() => {
    resetDailyToOctober();
  }, [allDailyItems.length, targetCategory]);

  if (!chartsData) {
    return (
      <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 animate-pulse"></div>
    );
  }

  // Active dataset according to selected category (Bongkar, Bajak, Siap Tanam) & periodMode
  let rawDataList: any[] = [];
  if (periodMode === 'daily') {
    if (allDailyItems.length > 0) {
      const s0 = Math.min(deferredDailyRange[0], deferredDailyRange[1]);
      const s1 = Math.max(deferredDailyRange[0], deferredDailyRange[1]);
      const safeStart = Math.min(Math.max(0, s0), allDailyItems.length - 1);
      const safeEnd = Math.min(Math.max(safeStart, s1), allDailyItems.length - 1);
      rawDataList = allDailyItems.slice(safeStart, safeEnd + 1);
    } else {
      rawDataList = [];
    }
  } else if (periodMode === 'weekly') {
    let sourceList: any[] = [];
    if (targetCategory === 'BONGKAR') sourceList = chartsData?.weeklyBongkar || [];
    else if (targetCategory === 'BAJAK') sourceList = chartsData?.weeklyBajak || [];
    else sourceList = chartsData?.weeklySiapTanam || [];

    // Map data minggu yang sudah ada
    const weekMap = new Map<number, any>();
    sourceList.forEach((item: any) => {
      const num = parseInt(String(item.periodKey || item.rawWeek || '').replace(/\D/g, ''), 10);
      if (!isNaN(num)) weekMap.set(num, item);
    });

    // Susun secara terurut dan berkesinambungan dari startWeek ke endWeek
    rawDataList = [];
    const startW = Math.min(deferredWeeklyRange[0], deferredWeeklyRange[1]);
    const endW = Math.max(deferredWeeklyRange[0], deferredWeeklyRange[1]);
    for (let w = startW; w <= endW; w++) {
      if (weekMap.has(w)) {
        rawDataList.push(weekMap.get(w));
      } else {
        const key = `Mgg ${String(w).padStart(2, '0')}`;
        rawDataList.push({
          periodKey: key,
          rawWeek: key,
          rencana: 0,
          realisasi: 0,
          deviasi: 0,
        });
      }
    }
  } else {
    // monthly
    if (targetCategory === 'BONGKAR') rawDataList = chartsData?.monthlyBongkar || [];
    else if (targetCategory === 'BAJAK') rawDataList = chartsData?.monthlyBajak || [];
    else rawDataList = chartsData?.monthlySiapTanam || [];

    const startM = Math.min(deferredMonthlyRange[0], deferredMonthlyRange[1]);
    const endM = Math.max(deferredMonthlyRange[0], deferredMonthlyRange[1]);
    rawDataList = rawDataList.filter((item: any) => {
      if (item.year && item.year !== 2026) return false;
      const idx = item.monthIndex ?? (MONTH_NAMES_LIST.findIndex((mn) => (item.month || item.periodKey || '').startsWith(mn)) + 1);
      return idx >= startM && idx <= endM;
    });
  }

  const activeChartData = rawDataList.map((item: any) => {
    const renc = item.rencana || 0;
    const real = item.realisasi !== null && item.realisasi !== undefined ? item.realisasi : null;
    const dev = real !== null ? Math.round((real - renc) * 100) / 100 : (item.deviasi ?? null);
    const pct = renc > 0 && real !== null ? Math.round((real / renc) * 1000) / 10 : null;

    return {
      periodKey: item.periodKey || item.month || item.year || '',
      rencana: renc,
      realisasi: real,
      deviasi: dev,
      capaianPct: pct,
    };
  });

  const totalRencana = Math.round(activeChartData.reduce((acc, c) => acc + (c.rencana || 0), 0) * 100) / 100;
  const totalRealisasi = Math.round(activeChartData.reduce((acc, c) => acc + (c.realisasi || 0), 0) * 100) / 100;
  const totalDeviasi = Math.round((totalRealisasi - totalRencana) * 100) / 100;
  const totalCapaian = totalRencana > 0 ? Math.round((totalRealisasi / totalRencana) * 1000) / 10 : 0;

  // Menghitung lebar grafik agar bar harian dan mingguan memiliki ruang cukup dan berjarak lega
  const chartWidth =
    periodMode === 'daily'
      ? activeChartData.length > 25
        ? Math.max(activeChartData.length * 36, 1800)
        : activeChartData.length <= 15
        ? undefined
        : Math.max(activeChartData.length * 44, 850)
      : periodMode === 'weekly'
      ? activeChartData.length <= 16
        ? undefined // 12-16 minggu pas dan memenuhi kartu secara proporsional tanpa scroll berlebih
        : Math.max(activeChartData.length * 48, 1200)
      : undefined;

  const getCategoryTitle = () => {
    switch (targetCategory) {
      case 'BONGKAR':
        return 'Bongkar';
      case 'BAJAK':
        return 'Bajak';
      case 'SIAP_TANAM':
        return 'Siap Tanam';
    }
  };

  const getPeriodLabel = () => {
    switch (periodMode) {
      case 'daily':
        return `Harian (${allDailyItems[dailyRange[0]]?.periodKey || ''} - ${allDailyItems[dailyRange[1]]?.periodKey || ''})`;
      case 'weekly':
        return `Mingguan (Mgg ${String(weeklyRange[0]).padStart(2, '0')} - Mgg ${String(weeklyRange[1]).padStart(2, '0')})`;
      case 'monthly':
        return `Bulanan (${MONTH_NAMES_LIST[monthlyRange[0] - 1]} - ${MONTH_NAMES_LIST[monthlyRange[1] - 1]} 2026)`;
    }
  };

  const CustomRencanaRealisasiTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      const realisasiVal = data?.realisasi !== null && data?.realisasi !== undefined ? data.realisasi : null;
      const rencanaVal = data?.rencana ?? 0;
      const deviasiVal = data?.deviasi ?? null;
      const capaianPct = data?.capaianPct ?? null;

      return (
        <div className="p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl text-xs min-w-[210px] backdrop-blur-xl pointer-events-none select-none">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2.5">
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 font-mono text-sm">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {label}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                {getCategoryTitle()}
              </span>
              <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {periodMode.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {/* Realisasi */}
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#00873D] shrink-0"></span>
                Realisasi:
              </span>
              <strong className="text-slate-900 dark:text-slate-100 font-extrabold font-mono text-xs">
                {realisasiVal !== null
                  ? `${Number(realisasiVal).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ha`
                  : '-'}
              </strong>
            </div>

            {/* Rencana */}
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#009EE2] shrink-0"></span>
                Rencana:
              </span>
              <strong className="text-slate-900 dark:text-slate-100 font-extrabold font-mono text-xs">
                {Number(rencanaVal).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ha
              </strong>
            </div>

            {/* Deviasi */}
            {deviasiVal !== null && (
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">Deviasi:</span>
                <span className={`font-mono font-bold text-xs ${deviasiVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {deviasiVal > 0 ? `+${deviasiVal.toFixed(2)}` : deviasiVal.toFixed(2)} Ha
                </span>
              </div>
            )}

            {/* Capaian */}
            {capaianPct !== null && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">Capaian:</span>
                <span className={`font-mono font-extrabold text-xs px-1.5 py-0.5 rounded ${
                  capaianPct >= 100
                    ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                    : capaianPct >= 80
                    ? 'bg-blue-500/15 text-blue-800 dark:text-blue-300'
                    : 'bg-rose-500/15 text-rose-800 dark:text-rose-300'
                }`}>
                  {capaianPct.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 glass-panel shadow-xs transition-colors">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Rencana vs Realisasi (Ha) - {getCategoryTitle()}
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {getPeriodLabel()}
              </span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Monitoring target dan capaian penyiapan lahan periode 2026
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          {/* 1. Category Toggle: Bongkar, Bajak, Siap Tanam */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setTargetCategory('BONGKAR')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                targetCategory === 'BONGKAR'
                  ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200'
              }`}
            >
              Bongkar
            </button>
            <button
              type="button"
              onClick={() => setTargetCategory('BAJAK')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                targetCategory === 'BAJAK'
                  ? 'bg-blue-500/20 text-blue-900 dark:text-blue-300 border border-blue-500/40 shadow-xs'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200'
              }`}
            >
              Bajak
            </button>
            <button
              type="button"
              onClick={() => setTargetCategory('SIAP_TANAM')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                targetCategory === 'SIAP_TANAM'
                  ? 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200'
              }`}
            >
              Siap Tanam
            </button>
          </div>

          {/* 2. Period Mode Toggle: Harian (Daily), Mingguan (Weekly), Bulanan (Monthly) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setPeriodMode('daily');
                resetDailyToOctober();
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodMode === 'daily'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200'
              }`}
            >
              Harian
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('weekly')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodMode === 'weekly'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200'
              }`}
            >
              Mingguan
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('monthly')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodMode === 'monthly'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200'
              }`}
            >
              Bulanan
            </button>
          </div>
        </div>
      </div>

      {/* Mini Executive Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3.5">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Realisasi
          </span>
          <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            {totalRealisasi.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ha
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Rencana
          </span>
          <span className="text-sm font-extrabold font-mono text-sky-600 dark:text-cyan-400">
            {totalRencana.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ha
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Selisih (Deviasi)
          </span>
          <span className={`text-sm font-extrabold font-mono ${totalDeviasi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {totalDeviasi >= 0 ? `+${totalDeviasi.toFixed(2)}` : totalDeviasi.toFixed(2)} Ha
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Capaian Target
          </span>
          <span className={`text-sm font-extrabold font-mono ${totalCapaian >= 100 ? 'text-emerald-600 dark:text-emerald-400' : totalCapaian >= 80 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {totalCapaian.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Filter Rentang Periode khusus Harian (Dual-Handle Range Slider) */}
      {periodMode === 'daily' && allDailyItems.length > 0 && (
        <div className="p-3.5 mb-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 shadow-2xs transition-all">
          {/* Dual Handle Range Slider Track for Daily */}
          <div className="pt-3 pb-1 px-2">
            <div
              onPointerDown={handleDailyTrackPointerDown}
              className="relative flex items-center w-full h-8 select-none cursor-pointer group touch-none"
            >
              {/* Base Track */}
              <div className="absolute left-0 right-0 h-2 group-hover:h-2.5 transition-all bg-slate-200 dark:bg-slate-800 rounded-full" />

              {/* Active Highlighted Range Bar */}
              <div
                className="absolute h-2 group-hover:h-2.5 transition-all bg-gradient-to-r from-emerald-500 via-[#00873D] to-teal-500 rounded-full shadow-xs pointer-events-none"
                style={{
                  left: `${(dailyRange[0] / Math.max(1, allDailyItems.length - 1)) * 100}%`,
                  width: `${((dailyRange[1] - dailyRange[0]) / Math.max(1, allDailyItems.length - 1)) * 100}%`,
                }}
              />

              {/* Tooltip Badge Handle Kiri (Start) */}
              <div
                className="absolute -top-4 -translate-x-1/2 pointer-events-none transition-all"
                style={{ left: `${(dailyRange[0] / Math.max(1, allDailyItems.length - 1)) * 100}%` }}
              >
                <span className="px-1.5 py-0.5 text-[9.5px] font-black font-mono rounded bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md whitespace-nowrap">
                  {allDailyItems[dailyRange[0]]?.periodKey || ''}
                </span>
              </div>

              {/* Tooltip Badge Handle Kanan (End) */}
              <div
                className="absolute -top-4 -translate-x-1/2 pointer-events-none transition-all"
                style={{ left: `${(dailyRange[1] / Math.max(1, allDailyItems.length - 1)) * 100}%` }}
              >
                <span className="px-1.5 py-0.5 text-[9.5px] font-black font-mono rounded bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md whitespace-nowrap">
                  {allDailyItems[dailyRange[1]]?.periodKey || ''}
                </span>
              </div>

              {/* Native Input 1 (Min) */}
              <input
                type="range"
                min={0}
                max={Math.max(1, allDailyItems.length - 1)}
                value={dailyRange[0]}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  setDailyRange((prev) => {
                    const val = Math.max(0, Math.min(num, prev[1]));
                    if (prev[0] === val) return prev;
                    return [val, prev[1]];
                  });
                }}
                className={`range-slider-thumb absolute left-0 right-0 w-full appearance-none bg-transparent pointer-events-none focus:outline-none ${
                  dailyRange[0] > (allDailyItems.length - 1) / 2 ? 'z-30' : 'z-20'
                }`}
              />

              {/* Native Input 2 (Max) */}
              <input
                type="range"
                min={0}
                max={Math.max(1, allDailyItems.length - 1)}
                value={dailyRange[1]}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  setDailyRange((prev) => {
                    const maxLimit = Math.max(0, allDailyItems.length - 1);
                    const val = Math.min(maxLimit, Math.max(num, prev[0]));
                    if (prev[1] === val) return prev;
                    return [prev[0], val];
                  });
                }}
                className={`range-slider-thumb absolute left-0 right-0 w-full appearance-none bg-transparent pointer-events-none focus:outline-none ${
                  dailyRange[0] > (allDailyItems.length - 1) / 2 ? 'z-20' : 'z-30'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filter Rentang Periode khusus Weekly (Dual-Handle Range Slider persis sesuai referensi) */}
      {periodMode === 'weekly' && (
        <div className="p-3.5 mb-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 shadow-2xs transition-all">
          {/* Dual Handle Range Slider Track */}
          <div className="pt-3 pb-1 px-2">
            <div
              onPointerDown={handleWeeklyTrackPointerDown}
              className="relative flex items-center w-full h-8 select-none cursor-pointer group touch-none"
            >
              {/* Base Track */}
              <div className="absolute left-0 right-0 h-2 group-hover:h-2.5 transition-all bg-slate-200 dark:bg-slate-800 rounded-full" />

              {/* Active Highlighted Range Bar */}
              <div
                className="absolute h-2 group-hover:h-2.5 transition-all bg-gradient-to-r from-emerald-500 via-[#00873D] to-teal-500 rounded-full shadow-xs pointer-events-none"
                style={{
                  left: `${((weeklyRange[0] - 1) / (52 - 1)) * 100}%`,
                  width: `${((weeklyRange[1] - weeklyRange[0]) / (52 - 1)) * 100}%`,
                }}
              />

              {/* Tooltip Badge Handle Kiri (Start) */}
              <div
                className="absolute -top-4 -translate-x-1/2 pointer-events-none transition-all"
                style={{ left: `${((weeklyRange[0] - 1) / (52 - 1)) * 100}%` }}
              >
                <span className="px-1.5 py-0.5 text-[9.5px] font-black font-mono rounded bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md whitespace-nowrap">
                  Mgg {weeklyRange[0]}
                </span>
              </div>

              {/* Tooltip Badge Handle Kanan (End) */}
              <div
                className="absolute -top-4 -translate-x-1/2 pointer-events-none transition-all"
                style={{ left: `${((weeklyRange[1] - 1) / (52 - 1)) * 100}%` }}
              >
                <span className="px-1.5 py-0.5 text-[9.5px] font-black font-mono rounded bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md whitespace-nowrap">
                  Mgg {weeklyRange[1]}
                </span>
              </div>

              {/* Native Input 1 (Min) */}
              <input
                type="range"
                min={1}
                max={52}
                value={weeklyRange[0]}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  setWeeklyRange((prev) => {
                    const val = Math.max(1, Math.min(num, prev[1]));
                    if (prev[0] === val) return prev;
                    return [val, prev[1]];
                  });
                }}
                className={`range-slider-thumb absolute left-0 right-0 w-full appearance-none bg-transparent pointer-events-none focus:outline-none ${
                  weeklyRange[0] > 26 ? 'z-30' : 'z-20'
                }`}
              />

              {/* Native Input 2 (Max) */}
              <input
                type="range"
                min={1}
                max={52}
                value={weeklyRange[1]}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  setWeeklyRange((prev) => {
                    const val = Math.min(52, Math.max(num, prev[0]));
                    if (prev[1] === val) return prev;
                    return [prev[0], val];
                  });
                }}
                className={`range-slider-thumb absolute left-0 right-0 w-full appearance-none bg-transparent pointer-events-none focus:outline-none ${
                  weeklyRange[0] > 26 ? 'z-20' : 'z-30'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filter Rentang Periode khusus Bulanan (Dual-Handle Range Slider) */}
      {periodMode === 'monthly' && (
        <div className="p-3.5 mb-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 shadow-2xs transition-all">
          {/* Dual Handle Range Slider Track for Monthly */}
          <div className="pt-3 pb-1 px-2">
            <div
              onPointerDown={handleMonthlyTrackPointerDown}
              className="relative flex items-center w-full h-8 select-none cursor-pointer group touch-none"
            >
              {/* Base Track */}
              <div className="absolute left-0 right-0 h-2 group-hover:h-2.5 transition-all bg-slate-200 dark:bg-slate-800 rounded-full" />

              {/* Active Highlighted Range Bar */}
              <div
                className="absolute h-2 group-hover:h-2.5 transition-all bg-gradient-to-r from-emerald-500 via-[#00873D] to-teal-500 rounded-full shadow-xs pointer-events-none"
                style={{
                  left: `${((monthlyRange[0] - 1) / (12 - 1)) * 100}%`,
                  width: `${((monthlyRange[1] - monthlyRange[0]) / (12 - 1)) * 100}%`,
                }}
              />

              {/* Tooltip Badge Handle Kiri (Start) */}
              <div
                className="absolute -top-4 -translate-x-1/2 pointer-events-none transition-all"
                style={{ left: `${((monthlyRange[0] - 1) / (12 - 1)) * 100}%` }}
              >
                <span className="px-1.5 py-0.5 text-[9.5px] font-black font-mono rounded bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md whitespace-nowrap">
                  {MONTH_NAMES_LIST[monthlyRange[0] - 1]}
                </span>
              </div>

              {/* Tooltip Badge Handle Kanan (End) */}
              <div
                className="absolute -top-4 -translate-x-1/2 pointer-events-none transition-all"
                style={{ left: `${((monthlyRange[1] - 1) / (12 - 1)) * 100}%` }}
              >
                <span className="px-1.5 py-0.5 text-[9.5px] font-black font-mono rounded bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md whitespace-nowrap">
                  {MONTH_NAMES_LIST[monthlyRange[1] - 1]}
                </span>
              </div>

              {/* Native Input 1 (Min) */}
              <input
                type="range"
                min={1}
                max={12}
                value={monthlyRange[0]}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  setMonthlyRange((prev) => {
                    const val = Math.max(1, Math.min(num, prev[1]));
                    if (prev[0] === val) return prev;
                    return [val, prev[1]];
                  });
                }}
                className={`range-slider-thumb absolute left-0 right-0 w-full appearance-none bg-transparent pointer-events-none focus:outline-none ${
                  monthlyRange[0] > 6 ? 'z-30' : 'z-20'
                }`}
              />

              {/* Native Input 2 (Max) */}
              <input
                type="range"
                min={1}
                max={12}
                value={monthlyRange[1]}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  setMonthlyRange((prev) => {
                    const val = Math.min(12, Math.max(num, prev[0]));
                    if (prev[1] === val) return prev;
                    return [prev[0], val];
                  });
                }}
                className={`range-slider-thumb absolute left-0 right-0 w-full appearance-none bg-transparent pointer-events-none focus:outline-none ${
                  monthlyRange[0] > 6 ? 'z-20' : 'z-30'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no data matches category */}
      {activeChartData.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-slate-800">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Tidak ada data {getCategoryTitle()} untuk periode terpilih.
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto pb-2">
          <div
            style={chartWidth ? { minWidth: `${chartWidth}px` } : undefined}
            className={`h-80 outline-none focus:outline-none select-none ${
              !chartWidth ? 'w-full min-w-[500px]' : ''
            }`}
          >
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <BarChart
                data={activeChartData}
                margin={{ top: 10, right: 20, left: -15, bottom: periodMode === 'daily' ? 24 : 15 }}
                barCategoryGap={
                  periodMode === 'daily'
                    ? activeChartData.length > 25
                      ? '28%'
                      : '20%'
                    : periodMode === 'weekly'
                    ? activeChartData.length <= 16
                      ? '22%'
                      : '28%'
                    : '15%'
                }
                barGap={4}
                className="outline-none focus:outline-none"
                style={{ outline: 'none' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} vertical={false} />
                <XAxis
                  dataKey="periodKey"
                  stroke={isDark ? '#475569' : '#cbd5e1'}
                  fontSize={10}
                  tickLine={false}
                  height={periodMode === 'daily' ? 52 : periodMode === 'weekly' && activeChartData.length > 16 ? 46 : 38}
                  angle={periodMode === 'daily' ? -45 : periodMode === 'weekly' && activeChartData.length > 16 ? -40 : -25}
                  textAnchor="end"
                  interval={periodMode === 'daily' && activeChartData.length > 31 ? 'preserveStartEnd' : 0}
                  tick={{ fill: isDark ? '#f1f5f9' : '#0f172a', fontSize: 10, fontWeight: 700 }}
                />
                <YAxis
                  stroke={isDark ? '#475569' : '#cbd5e1'}
                  fontSize={11}
                  tickLine={false}
                  tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 10, fontWeight: 600 }}
                />
                <Tooltip
                  content={<CustomRencanaRealisasiTooltip />}
                  cursor={{
                    fill: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                    pointerEvents: 'none',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  content={() => {
                    return (
                      <div className="flex flex-wrap items-center justify-center gap-4 pt-5 select-none">
                        {(barVisibility === 'both' || barVisibility === 'rencana') && (
                          <button
                            type="button"
                            onClick={() => handleBarToggle('rencana')}
                            className="flex items-center gap-2 text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer bg-[#009EE2]/10 hover:bg-[#009EE2]/20 text-[#007cb5] dark:text-[#38bdf8] border-[#009EE2]/30 shadow-2xs active:scale-95"
                            title={
                              barVisibility === 'rencana'
                                ? 'Klik untuk menampilkan kembali kedua data'
                                : 'Klik untuk hanya menampilkan bar Rencana'
                            }
                          >
                            <span className="w-3 h-3 rounded-xs bg-[#009EE2] shrink-0" />
                            <span>Rencana (Ha)</span>
                          </button>
                        )}

                        {(barVisibility === 'both' || barVisibility === 'realisasi') && (
                          <button
                            type="button"
                            onClick={() => handleBarToggle('realisasi')}
                            className="flex items-center gap-2 text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer bg-[#00873D]/10 hover:bg-[#00873D]/20 text-[#00873D] dark:text-[#4ade80] border-[#00873D]/30 shadow-2xs active:scale-95"
                            title={
                              barVisibility === 'realisasi'
                                ? 'Klik untuk menampilkan kembali kedua data'
                                : 'Klik untuk hanya menampilkan bar Realisasi'
                            }
                          >
                            <span className="w-3 h-3 rounded-xs bg-[#00873D] shrink-0" />
                            <span>Realisasi (Ha)</span>
                          </button>
                        )}
                      </div>
                    );
                  }}
                />
                {(barVisibility === 'both' || barVisibility === 'rencana') && (
                  <Bar
                    dataKey="rencana"
                    name="Rencana (Ha)"
                    fill="#009EE2"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleBarToggle('rencana')}
                    maxBarSize={
                      barVisibility === 'rencana'
                        ? 32
                        : periodMode === 'daily'
                        ? activeChartData.length > 25
                          ? 16
                          : 24
                        : periodMode === 'weekly'
                        ? activeChartData.length <= 16
                          ? 28
                          : 16
                        : 28
                    }
                  />
                )}
                {(barVisibility === 'both' || barVisibility === 'realisasi') && (
                  <Bar
                    dataKey="realisasi"
                    name="Realisasi (Ha)"
                    fill="#00873D"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleBarToggle('realisasi')}
                    maxBarSize={
                      barVisibility === 'realisasi'
                        ? 32
                        : periodMode === 'daily'
                        ? activeChartData.length > 25
                          ? 16
                          : 24
                        : periodMode === 'weekly'
                        ? activeChartData.length <= 16
                          ? 28
                          : 16
                        : 28
                    }
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 3. PROSES TANAM & SELESAI TANAM PER WILAYAH
// =========================================================================
export function ProsesTanamSection({
  chartsData,
  onSelectLand,
  selectedWilayah,
  setSelectedWilayah,
  availableWilayahs,
}: CommonChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hideProses, setHideProses] = useState(false);
  const [hideSelesai, setHideSelesai] = useState(false);

  // Defensive aggregation ensuring strictly W01-W07 unique regions
  const normalizedData = React.useMemo(() => {
    const stdRegions = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07'];
    const map: Record<string, any> = {};
    for (const r of stdRegions) {
      map[r] = {
        wilayah: r,
        prosesCount: 0,
        prosesLuas: 0,
        prosesLocations: [] as string[],
        selesaiCount: 0,
        selesaiLuas: 0,
        selesaiLocations: [] as string[],
      };
    }

    const normalizeCode = (raw: string) => {
      if (!raw) return 'W01';
      const c = raw.trim().toUpperCase();
      if (c === 'ARS1') return 'W07';
      if (c === 'SAG1' || c === 'MD2') return 'W04';
      if (c.startsWith('AW0')) return 'W0' + c.slice(3);
      if (c.startsWith('AW')) {
        const n = c.slice(2);
        return n.length === 1 ? `W0${n}` : `W${n}`;
      }
      return c;
    };

    if (chartsData?.wilayahPositions) {
      for (const item of chartsData.wilayahPositions) {
        const code = normalizeCode(item.wilayah);
        if (map[code]) {
          map[code].prosesCount += item.prosesCount || 0;
          map[code].prosesLuas += item.prosesLuas || 0;
          map[code].prosesLocations.push(...(item.prosesLocations || []));
          map[code].selesaiCount += item.selesaiCount || 0;
          map[code].selesaiLuas += item.selesaiLuas || 0;
          map[code].selesaiLocations.push(...(item.selesaiLocations || []));
        }
      }
    }

    return stdRegions.map((r) => ({
      ...map[r],
      prosesLuas: Math.round(map[r].prosesLuas * 100) / 100,
      selesaiLuas: Math.round(map[r].selesaiLuas * 100) / 100,
      prosesLocations: Array.from(new Set(map[r].prosesLocations)),
      selesaiLocations: Array.from(new Set(map[r].selesaiLocations)),
    }));
  }, [chartsData?.wilayahPositions]);

  const selectedWilayahList = useMemo(() => {
    if (!selectedWilayah || selectedWilayah === 'ALL') return null;
    return selectedWilayah.split(',').map((w) => w.trim()).filter(Boolean);
  }, [selectedWilayah]);

  const displayData = useMemo(() => {
    if (!selectedWilayahList || selectedWilayahList.length === 0) return normalizedData;
    return normalizedData.filter((item) => selectedWilayahList.includes(item.wilayah));
  }, [normalizedData, selectedWilayahList]);

  if (!chartsData || !chartsData.wilayahPositions) return null;

  // Clicking W01..W07 below the chart cycles through hide legend
  const handleWilayahTickClick = (_wilayah: string) => {
    if (!hideProses && !hideSelesai) {
      // Hide Selesai Tanam -> only Proses Tanam visible
      setHideProses(false);
      setHideSelesai(true);
    } else if (!hideProses && hideSelesai) {
      // Hide Proses Tanam -> only Selesai Tanam visible
      setHideProses(true);
      setHideSelesai(false);
    } else {
      // Unhide both -> Kedua-duanya visible
      setHideProses(false);
      setHideSelesai(false);
    }
  };

  const totalProses = displayData.reduce((acc, curr) => acc + curr.prosesCount, 0);
  const totalProsesLuas = Math.round(displayData.reduce((acc, curr) => acc + curr.prosesLuas, 0) * 100) / 100;
  const totalSelesai = displayData.reduce((acc, curr) => acc + curr.selesaiCount, 0);
  const totalSelesaiLuas = Math.round(displayData.reduce((acc, curr) => acc + curr.selesaiLuas, 0) * 100) / 100;
  const totalTanamLokasi = totalProses + totalSelesai;
  const totalTanamLuas = Math.round((totalProsesLuas + totalSelesaiLuas) * 100) / 100;

  const CustomPlantingTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = displayData.find((w) => w.wilayah === label);
      const prosesLocs = item?.prosesLocations || [];
      const selesaiLocs = item?.selesaiLocations || [];
      const prosesLuas = item?.prosesLuas || 0;
      const selesaiLuas = item?.selesaiLuas || 0;

      return (
        <div className="p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl text-xs max-w-sm backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 font-mono text-sm">
              <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Wilayah {label}
            </span>
            <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Total: {(item?.selesaiCount || 0) + (item?.prosesCount || 0)} Lokasi
            </span>
          </div>

          {/* Selesai */}
          {!hideSelesai && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Selesai Tanam:
                </span>
                <div className="text-right">
                  <strong className="text-slate-900 dark:text-slate-100 font-extrabold">{selesaiLocs.length} Lokasi</strong>
                  {selesaiLuas > 0 && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5">({selesaiLuas.toFixed(2)} Ha)</span>
                  )}
                </div>
              </div>
              {selesaiLocs.length > 0 && (
                <div className="max-h-24 overflow-y-auto mt-1.5 flex flex-wrap gap-1">
                  {selesaiLocs.map((loc: string) => (
                    <button
                      key={loc}
                      onClick={() => onSelectLand && onSelectLand(loc)}
                      className="font-mono text-[9px] bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-500 hover:text-white dark:hover:text-slate-950 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Proses */}
          {!hideProses && (
            <div className={!hideSelesai ? 'border-t border-slate-200 dark:border-slate-800/80 pt-2' : ''}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Proses Tanam:
                </span>
                <div className="text-right">
                  <strong className="text-slate-900 dark:text-slate-100 font-extrabold">{prosesLocs.length} Lokasi</strong>
                  {prosesLuas > 0 && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5">({prosesLuas.toFixed(2)} Ha)</span>
                  )}
                </div>
              </div>
              {prosesLocs.length > 0 && (
                <div className="max-h-24 overflow-y-auto mt-1.5 flex flex-wrap gap-1">
                  {prosesLocs.map((loc: string) => (
                    <button
                      key={loc}
                      onClick={() => onSelectLand && onSelectLand(loc)}
                      className="font-mono text-[9px] bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-500 hover:text-white dark:hover:text-slate-950 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Helper render shape adaptif:
  // - Jika batang berada di puncak teratas tiang (baik orange maupun hijau) -> sudut atas membulat [6, 6, 0, 0]
  // - Jika batang berada di bagian bawah/tengah (ada data lain di atasnya) -> flat rata [0, 0, 0, 0] agar menyatu mulus tanpa celah
  const renderCustomBar = (props: any) => {
    if (!props.height || props.height <= 0) return null;
    const totalCount =
      (hideProses ? 0 : props.payload?.prosesCount || 0) +
      (hideSelesai ? 0 : props.payload?.selesaiCount || 0);

    let isTop = true;
    if (Array.isArray(props.value)) {
      const [_startVal, endVal] = props.value;
      isTop = endVal >= totalCount - 0.001;
    }

    const radius = isTop ? [6, 6, 0, 0] : [0, 0, 0, 0];
    return <Rectangle {...props} radius={radius} />;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 glass-panel shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Proses Tanam & Selesai Tanam per Wilayah
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Total: {totalTanamLokasi} Lokasi ({totalTanamLuas.toLocaleString('id-ID')} Ha)
              </span>
            </div>
          </div>
        </div>

        {setSelectedWilayah && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <WilayahFilterDropdown
              selectedWilayah={selectedWilayah}
              setSelectedWilayah={setSelectedWilayah}
              availableWilayahs={availableWilayahs || ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07']}
            />
          </div>
        )}
      </div>

      <div className="h-80 w-full outline-none focus:outline-none select-none">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayData}
            margin={{ top: 10, right: 10, left: -20, bottom: 14 }}
            className="outline-none focus:outline-none"
          >
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} vertical={false} />
            <XAxis
              dataKey="wilayah"
              stroke={isDark ? '#475569' : '#cbd5e1'}
              fontSize={11}
              tickLine={false}
              interval={0}
              tick={(props: any) => {
                const { x, y, payload } = props;
                return (
                  <g
                    transform={`translate(${x},${y})`}
                    style={{ cursor: 'pointer', pointerEvents: 'all' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWilayahTickClick(payload.value);
                    }}
                    className="group select-none"
                  >
                    <title>{`Wilayah ${payload.value}: Klik untuk beralih tampilan (Semua / Proses / Selesai)`}</title>
                    <rect
                      x={-20}
                      y={4}
                      width={40}
                      height={20}
                      rx={6}
                      className="fill-slate-100/60 dark:fill-slate-800/60 group-hover:fill-amber-500/20 dark:group-hover:fill-amber-500/30 transition-all border border-transparent group-hover:border-amber-500/30"
                    />
                    <text
                      x={0}
                      y={18}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight="700"
                      className="transition-colors font-mono fill-slate-700 dark:fill-slate-300 group-hover:fill-amber-600 dark:group-hover:fill-amber-400"
                    >
                      {payload.value}
                    </text>
                  </g>
                );
              }}
            />
            <YAxis
              stroke={isDark ? '#475569' : '#cbd5e1'}
              fontSize={11}
              tickLine={false}
              allowDecimals={false}
              tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 10, fontWeight: 600 }}
            />
            <Tooltip content={<CustomPlantingTooltip />} />

            {/* Interactive Legend - hanya menampilkan item aktif, menyembunyikan yang tidak dipilih */}
            <Legend
              verticalAlign="bottom"
              height={52}
              content={() => {
                return (
                  <div className="flex flex-wrap items-center justify-center gap-4 pt-5 select-none">
                    {!hideProses && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!hideSelesai) {
                            // Kedua-duanya sedang tampil -> pilih hanya Proses Tanam
                            setHideProses(false);
                            setHideSelesai(true);
                          } else {
                            // Hanya Proses Tanam -> kembalikan ke kedua-duanya
                            setHideProses(false);
                            setHideSelesai(false);
                          }
                        }}
                        className="flex items-center gap-2 text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-500/30 shadow-xs hover:bg-amber-500/25 active:scale-95"
                        title={
                          hideSelesai
                            ? 'Klik untuk menampilkan kembali kedua data'
                            : 'Klik untuk hanya menampilkan Proses Tanam'
                        }
                      >
                        <span className="w-3 h-3 rounded-xs bg-[#F58220]" />
                        <span>Proses Tanam (Lokasi)</span>
                      </button>
                    )}

                    {!hideSelesai && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!hideProses) {
                            // Kedua-duanya sedang tampil -> pilih hanya Selesai Tanam
                            setHideProses(true);
                            setHideSelesai(false);
                          } else {
                            // Hanya Selesai Tanam -> kembalikan ke kedua-duanya
                            setHideProses(false);
                            setHideSelesai(false);
                          }
                        }}
                        className="flex items-center gap-2 text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border-emerald-500/30 shadow-xs hover:bg-emerald-500/25 active:scale-95"
                        title={
                          hideProses
                            ? 'Klik untuk menampilkan kembali kedua data'
                            : 'Klik untuk hanya menampilkan Selesai Tanam'
                        }
                      >
                        <span className="w-3 h-3 rounded-xs bg-[#00873D]" />
                        <span>Selesai Tanam (Lokasi)</span>
                      </button>
                    )}
                  </div>
                );
              }}
            />

            {!hideProses && (
              <Bar
                dataKey="prosesCount"
                name="Proses Tanam (Lokasi)"
                fill="#F58220"
                stackId={!hideSelesai ? 'tanam' : undefined}
                shape={renderCustomBar}
              />
            )}
            {!hideSelesai && (
              <Bar
                dataKey="selesaiCount"
                name="Selesai Tanam (Lokasi)"
                fill="#00873D"
                stackId={!hideProses ? 'tanam' : undefined}
                shape={renderCustomBar}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Status bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 flex-wrap">
          <span>
            Selesai Tanam:{' '}
            <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
              {totalSelesai} Lokasi ({totalSelesaiLuas.toLocaleString('id-ID')} Ha)
            </strong>
          </span>
          <span>•</span>
          <span>
            Proses Tanam:{' '}
            <strong className="text-amber-700 dark:text-amber-400 font-bold">
              {totalProses} Lokasi ({totalProsesLuas.toLocaleString('id-ID')} Ha)
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}

// Default export wrapper containing all charts if used monolithically
export default function ChartsSection({ chartsData, onSelectLand }: CommonChartProps) {
  return (
    <div className="space-y-8">
      <PosisiLahanSection chartsData={chartsData} onSelectLand={onSelectLand} />
      <RencanaRealisasiSection chartsData={chartsData} onSelectLand={onSelectLand} />
      <ProsesTanamSection chartsData={chartsData} onSelectLand={onSelectLand} />
    </div>
  );
}
