'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

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
}

interface CommonChartProps {
  chartsData: ChartsDataProps | null;
  onSelectLand?: (lokasi: string) => void;
}

// =========================================================================
// 1. POSISI LAHAN PER WILAYAH (BK, BJK, SN)
//    Warna batang dinamis berdasar ketinggian nilai (Tinggi -> Rendah)
// =========================================================================
export function PosisiLahanSection({ chartsData, onSelectLand }: CommonChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!chartsData || !chartsData.wilayahPositions) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800"></div>
        ))}
      </div>
    );
  }

  // Urutkan dataset berdasarkan urutan wilayah (bukan nilai tertinggi ke terendah)
  const sortedBK = [...chartsData.wilayahPositions]
    .map((w) => ({ ...w, luas: w.bkLuas || 0 }))
    .sort((a, b) => a.wilayah.localeCompare(b.wilayah, undefined, { numeric: true, sensitivity: 'base' }));

  const sortedBJK = [...chartsData.wilayahPositions]
    .map((w) => ({ ...w, luas: w.bjkLuas || 0 }))
    .sort((a, b) => a.wilayah.localeCompare(b.wilayah, undefined, { numeric: true, sensitivity: 'base' }));

  const sortedSN = [...chartsData.wilayahPositions]
    .map((w) => ({ ...w, luas: w.snLuas || 0 }))
    .sort((a, b) => a.wilayah.localeCompare(b.wilayah, undefined, { numeric: true, sensitivity: 'base' }));

  const maxBK = Math.max(...sortedBK.map((w) => w.luas), 1);
  const maxBJK = Math.max(...sortedBJK.map((w) => w.luas), 1);
  const maxSN = Math.max(...sortedSN.map((w) => w.luas), 1);

  // Cari wilayah dengan luas tertinggi untuk ditampilkan pada label ringkasan
  const highestBK = [...sortedBK].sort((a, b) => b.luas - a.luas)[0];
  const highestBJK = [...sortedBJK].sort((a, b) => b.luas - a.luas)[0];
  const highestSN = [...sortedSN].sort((a, b) => b.luas - a.luas)[0];

  // Helper untuk mendapatkan map ranking berdasarkan luas (agar rank tetap valid pada tooltip)
  const getRankMap = (list: typeof sortedBK) => {
    const sortedByLuas = [...list].sort((a, b) => b.luas - a.luas);
    return new Map(sortedByLuas.map((item, idx) => [item.wilayah, idx + 1]));
  };

  const rankMapBK = getRankMap(sortedBK);
  const rankMapBJK = getRankMap(sortedBJK);
  const rankMapSN = getRankMap(sortedSN);

  // Dynamic bar coloring based on height/value relative to maximum (GGF Logo Palette)
  // Tinggi -> GGF Green, Sedang-Tinggi -> GGF Leaf, Sedang -> GGF Sky Blue, Sedang-Rendah -> GGF Orange, Rendah -> Coral Rose
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

  // Custom Interactive Tooltip with Ranking & Height Tier indicator
  const CustomWilayahRankTooltip = ({
    active,
    payload,
    label,
    stageKey,
    title,
    maxVal,
  }: any) => {
    if (active && payload && payload.length) {
      const item = chartsData.wilayahPositions.find((w) => w.wilayah === label);
      const locations: string[] = item ? (item as any)[stageKey] || [] : [];
      const luas = payload[0]?.value ?? 0;
      const rank = payload[0]?.payload?.rank ?? 1;
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Posisi Lahan per Wilayah (BK, BJK, SN)
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Grafik 1: BK (Bongkar) */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 glass-panel shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Posisi Lahan BK per Wilayah
              </h4>
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                Tertinggi: <strong className="text-slate-900 dark:text-slate-200 font-bold">{highestBK?.wilayah}</strong> ({highestBK?.luas.toFixed(1)} Ha)
              </span>
            </div>
            <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
              Bongkar
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedBK.map((item) => ({ ...item, rank: rankMapBK.get(item.wilayah) || 1 }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} vertical={false} />
                <XAxis
                  dataKey="wilayah"
                  stroke={isDark ? '#475569' : '#cbd5e1'}
                  tickLine={false}
                  interval={0}
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
                      stageKey="bkLocations"
                      title="Luas Bongkar (BK)"
                      maxVal={maxBK}
                    />
                  }
                />
                <Bar dataKey="luas" name="Luas BK (Ha)" radius={[4, 4, 0, 0]}>
                  {sortedBK.map((entry, index) => {
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

        {/* Grafik 2: BJK (Bajak) */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 glass-panel shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                Posisi Lahan BJK per Wilayah
              </h4>
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                Tertinggi: <strong className="text-slate-900 dark:text-slate-200 font-bold">{highestBJK?.wilayah}</strong> ({highestBJK?.luas.toFixed(1)} Ha)
              </span>
            </div>
            <span className="text-[10px] text-blue-800 dark:text-blue-300 font-bold bg-blue-500/15 px-2 py-0.5 rounded border border-blue-500/30">
              Bajak
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedBJK.map((item) => ({ ...item, rank: rankMapBJK.get(item.wilayah) || 1 }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} vertical={false} />
                <XAxis
                  dataKey="wilayah"
                  stroke={isDark ? '#475569' : '#cbd5e1'}
                  tickLine={false}
                  interval={0}
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
                      stageKey="bjkLocations"
                      title="Luas Bajak (BJK)"
                      maxVal={maxBJK}
                    />
                  }
                />
                <Bar dataKey="luas" name="Luas BJK (Ha)" radius={[4, 4, 0, 0]}>
                  {sortedBJK.map((entry, index) => {
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

        {/* Grafik 3: SN (Siap Tanam) */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 glass-panel shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Posisi Lahan SN per Wilayah
              </h4>
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
                Tertinggi: <strong className="text-slate-900 dark:text-slate-200 font-bold">{highestSN?.wilayah}</strong> ({highestSN?.luas.toFixed(1)} Ha)
              </span>
            </div>
            <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
              Siap Tanam
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedSN.map((item) => ({ ...item, rank: rankMapSN.get(item.wilayah) || 1 }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} vertical={false} />
                <XAxis
                  dataKey="wilayah"
                  stroke={isDark ? '#475569' : '#cbd5e1'}
                  tickLine={false}
                  interval={0}
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
                      stageKey="snLocations"
                      title="Luas Siap Tanam (SN)"
                      maxVal={maxSN}
                    />
                  }
                />
                <Bar dataKey="luas" name="Luas SN (Ha)" radius={[4, 4, 0, 0]}>
                  {sortedSN.map((entry, index) => {
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
      </div>
    </div>
  );
}

// =========================================================================
// 2. RENCANA VS REALISASI (HA)
//    Urutan kategori: Bongkar, Bajak, Siap Tanam
// =========================================================================
export function RencanaRealisasiSection({ chartsData }: CommonChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [targetCategory, setTargetCategory] = useState<'BONGKAR' | 'BAJAK' | 'SIAP_TANAM'>('BONGKAR');

  if (!chartsData) {
    return (
      <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 animate-pulse"></div>
    );
  }

  // Active dataset according to selected category (Bongkar, Bajak, Siap Tanam) - Periode 2026 (Jan-26 s/d Des-26)
  let rawDataList: any[] = [];
  if (targetCategory === 'BONGKAR') rawDataList = chartsData.monthlyBongkar || [];
  else if (targetCategory === 'BAJAK') rawDataList = chartsData.monthlyBajak || [];
  else rawDataList = chartsData.monthlySiapTanam || [];

  // Filter khusus periode 2026 (Jan-26 s/d Des-26)
  rawDataList = rawDataList.filter((item: any) => {
    if (item.year && item.year !== 2026) return false;
    const m = (item.month || item.periodKey || item.monthYear || '').trim().toLowerCase();
    return m.endsWith('-26');
  });

  const activeChartData = rawDataList.map((item: any) => {
    const renc = item.rencana || 0;
    const real = item.realisasi !== null && item.realisasi !== undefined ? item.realisasi : null;
    const dev = real !== null ? Math.round((real - renc) * 100) / 100 : (item.deviasi ?? null);
    const pct = renc > 0 && real !== null ? Math.round((real / renc) * 1000) / 10 : null;

    return {
      periodKey: item.month || item.year || '',
      rencana: renc,
      realisasi: real,
      deviasi: dev,
      capaianPct: pct,
    };
  });

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

  const CustomRencanaRealisasiTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      const realisasiVal = data?.realisasi !== null && data?.realisasi !== undefined ? data.realisasi : null;
      const rencanaVal = data?.rencana ?? 0;
      const deviasiVal = data?.deviasi ?? null;
      const capaianPct = data?.capaianPct ?? null;

      return (
        <div className="p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl text-xs min-w-[210px] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2.5">
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 font-mono text-sm">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {label}
            </span>
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              {getCategoryTitle()}
            </span>
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
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 glass-panel shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Rencana vs Realisasi (Ha) - {getCategoryTitle()}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
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
        </div>
      </div>

      {/* Empty State when no data matches category */}
      {activeChartData.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-slate-800">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Tidak ada data {getCategoryTitle()} untuk periode 2026.
          </p>
        </div>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activeChartData}
              margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} vertical={false} />
              <XAxis
                dataKey="periodKey"
                stroke={isDark ? '#475569' : '#cbd5e1'}
                fontSize={11}
                tickLine={false}
                height={48}
                angle={-30}
                textAnchor="end"
                tick={{ fill: isDark ? '#f1f5f9' : '#0f172a', fontSize: 11, fontWeight: 700 }}
              />
              <YAxis
                stroke={isDark ? '#475569' : '#cbd5e1'}
                fontSize={11}
                tickLine={false}
                tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 10, fontWeight: 600 }}
              />
              <Tooltip content={<CustomRencanaRealisasiTooltip />} />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{
                  fontSize: '11px',
                  paddingTop: '20px',
                  paddingBottom: '2px',
                  bottom: 0,
                }}
                formatter={(val) => (
                  <span className="text-slate-900 dark:text-slate-100 font-bold text-xs">
                    {val}
                  </span>
                )}
              />
              <Bar dataKey="rencana" name="Rencana (Ha)" fill="#009EE2" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realisasi" name="Realisasi (Ha)" fill="#00873D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 3. PROSES TANAM & SELESAI TANAM PER WILAYAH
// =========================================================================
export function ProsesTanamSection({ chartsData, onSelectLand }: CommonChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hideProses, setHideProses] = useState(false);
  const [hideSelesai, setHideSelesai] = useState(false);

  if (!chartsData || !chartsData.wilayahPositions) return null;

  // Clicking w01 and so on below the chart cycles through hiding legend items
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

  const CustomPlantingTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = chartsData.wilayahPositions.find((w) => w.wilayah === label);
      const prosesLocs = item?.prosesLocations || [];
      const selesaiLocs = item?.selesaiLocations || [];

      return (
        <div className="p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl text-xs max-w-sm backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 font-mono text-sm">
              <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Wilayah {label}
            </span>
            <span className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Status Tanam
            </span>
          </div>

          {/* Selesai */}
          {!hideSelesai && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Selesai Tanam:
                </span>
                <strong className="text-slate-900 dark:text-slate-100 font-extrabold">{selesaiLocs.length} Lokasi</strong>
              </div>
              {selesaiLocs.length > 0 && (
                <div className="max-h-20 overflow-y-auto mt-1 flex flex-wrap gap-1">
                  {selesaiLocs.map((loc) => (
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
                <strong className="text-slate-900 dark:text-slate-100 font-extrabold">{prosesLocs.length} Lokasi</strong>
              </div>
              {prosesLocs.length > 0 && (
                <div className="max-h-20 overflow-y-auto mt-1 flex flex-wrap gap-1">
                  {prosesLocs.map((loc) => (
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

  const activeModeLabel = !hideProses && !hideSelesai
    ? 'Kedua-duanya'
    : !hideProses && hideSelesai
    ? 'Hanya Proses Tanam'
    : hideProses && !hideSelesai
    ? 'Hanya Selesai Tanam'
    : 'Semua Di-hide';

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 glass-panel shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {!hideProses && !hideSelesai
                  ? 'Proses Tanam & Selesai Tanam per Wilayah'
                  : !hideProses && hideSelesai
                  ? 'Grafik Proses Tanam per Wilayah'
                  : 'Grafik Selesai Tanam per Wilayah'}
              </h3>
            </div>
          </div>
        </div>

        {/* View Mode Toggle Controls */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setHideProses(false);
              setHideSelesai(false);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              !hideProses && !hideSelesai
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200'
            }`}
          >
            Kedua-duanya
          </button>
          <button
            type="button"
            onClick={() => {
              setHideProses(false);
              setHideSelesai(true);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              !hideProses && hideSelesai
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-700 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Proses Tanam
          </button>
          <button
            type="button"
            onClick={() => {
              setHideProses(true);
              setHideSelesai(false);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              hideProses && !hideSelesai
                ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-sm'
                : 'text-slate-700 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Selesai Tanam
          </button>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartsData.wilayahPositions}
            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
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
                    <title>{`Wilayah ${payload.value}: Klik untuk hide legend / ganti grafik`}</title>
                    <rect
                      x={-18}
                      y={3}
                      width={36}
                      height={18}
                      rx={5}
                      className="fill-transparent group-hover:fill-slate-200/80 dark:group-hover:fill-slate-800 transition-all"
                    />
                    <text
                      x={0}
                      y={16}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight="700"
                      className="transition-colors font-mono fill-slate-900 dark:fill-slate-100 group-hover:fill-amber-600 dark:group-hover:fill-amber-400"
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
              tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 10, fontWeight: 600 }}
            />
            <Tooltip content={<CustomPlantingTooltip />} />

            {/* Interactive Clickable Legend to Hide/Show series */}
            <Legend
              verticalAlign="bottom"
              height={40}
              content={() => {
                return (
                  <div className="flex flex-wrap items-center justify-center gap-4 pt-3 select-none">
                    <button
                      type="button"
                      onClick={() => {
                        if (!hideProses && hideSelesai) {
                          setHideSelesai(false);
                        } else {
                          setHideProses(!hideProses);
                        }
                      }}
                      className={`flex items-center gap-2 text-xs font-bold transition-all cursor-pointer px-3 py-1.5 rounded-lg border ${
                        hideProses
                          ? 'opacity-40 line-through bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                          : 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                      }`}
                      title={hideProses ? 'Klik untuk memunculkan kembali Proses Tanam' : 'Klik untuk hide legend Proses Tanam'}
                    >
                      <span className={`w-3 h-3 rounded-xs ${hideProses ? 'bg-slate-400' : 'bg-amber-500'}`} />
                      <span>Proses Tanam (Lokasi)</span>
                      {hideProses && <span className="text-[10px] font-normal no-underline ml-0.5">(Hidden)</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (hideProses && !hideSelesai) {
                          setHideProses(false);
                        } else {
                          setHideSelesai(!hideSelesai);
                        }
                      }}
                      className={`flex items-center gap-2 text-xs font-bold transition-all cursor-pointer px-3 py-1.5 rounded-lg border ${
                        hideSelesai
                          ? 'opacity-40 line-through bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                          : 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                      }`}
                      title={hideSelesai ? 'Klik untuk memunculkan kembali Selesai Tanam' : 'Klik untuk hide legend Selesai Tanam'}
                    >
                      <span className={`w-3 h-3 rounded-xs ${hideSelesai ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                      <span>Selesai Tanam (Lokasi)</span>
                      {hideSelesai && <span className="text-[10px] font-normal no-underline ml-0.5">(Hidden)</span>}
                    </button>

                    {(hideProses || hideSelesai) && (
                      <button
                        type="button"
                        onClick={() => {
                          setHideProses(false);
                          setHideSelesai(false);
                        }}
                        className="text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer flex items-center gap-1 ml-1"
                      >
                        Reset (Munculkan Semua)
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
                radius={hideSelesai ? [4, 4, 0, 0] : undefined}
              />
            )}
            {!hideSelesai && (
              <Bar
                dataKey="selesaiCount"
                name="Selesai Tanam (Lokasi)"
                fill="#00873D"
                stackId={!hideProses ? 'tanam' : undefined}
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Status bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end text-xs">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-slate-600 dark:text-slate-400 font-medium">Grafik Aktif:</span>
          <span className="font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            {activeModeLabel}
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
