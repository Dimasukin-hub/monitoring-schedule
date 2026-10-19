'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Calendar } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import MultiSelectDropdown from './MultiSelectDropdown';

interface BeroChartItem {
  periodKey: string;
  year: number;
  monthNum: number;
  label: string;
  rfc: number | null;
  rencana: number | null;
  realisasi: number | null;
  deviasi?: number | null;
}

interface RangeBeroChartItem {
  periodKey: string;
  year: number;
  monthNum: number;
  label: string;
  totalHa: number;
  countLands: number;
  '< 80': number;
  '80 - 90': number;
  '90 - 120': number;
  '120 - 150': number;
  '150 - 180': number;
  '180 - 210': number;
  '210 - 240': number;
  '> 240': number;
}

interface BeroApiResponse {
  title: string;
  subtitle: string;
  beroChartData: BeroChartItem[];
  rangeBeroChartData: RangeBeroChartItem[];
}

export const BERO_RANGES = [
  {
    key: '< 80',
    label: '< 80',
    color: '#10b981',
    badgeBg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    textCol: 'text-emerald-700 dark:text-emerald-300',
    borderCol: 'border-emerald-500/30',
    ringCol: 'ring-emerald-500/20',
  },
  {
    key: '80 - 90',
    label: '80 - 90',
    color: '#14b8a6',
    badgeBg: 'bg-teal-500/10 hover:bg-teal-500/20',
    textCol: 'text-teal-700 dark:text-teal-300',
    borderCol: 'border-teal-500/30',
    ringCol: 'ring-teal-500/20',
  },
  {
    key: '90 - 120',
    label: '90 - 120',
    color: '#0284c7',
    badgeBg: 'bg-sky-500/10 hover:bg-sky-500/20',
    textCol: 'text-sky-700 dark:text-sky-300',
    borderCol: 'border-sky-500/30',
    ringCol: 'ring-sky-500/20',
  },
  {
    key: '120 - 150',
    label: '120 - 150',
    color: '#6366f1',
    badgeBg: 'bg-indigo-500/10 hover:bg-indigo-500/20',
    textCol: 'text-indigo-700 dark:text-indigo-300',
    borderCol: 'border-indigo-500/30',
    ringCol: 'ring-indigo-500/20',
  },
  {
    key: '150 - 180',
    label: '150 - 180',
    color: '#f59e0b',
    badgeBg: 'bg-amber-500/10 hover:bg-amber-500/20',
    textCol: 'text-amber-700 dark:text-amber-300',
    borderCol: 'border-amber-500/30',
    ringCol: 'ring-amber-500/20',
  },
  {
    key: '180 - 210',
    label: '180 - 210',
    color: '#f97316',
    badgeBg: 'bg-orange-500/10 hover:bg-orange-500/20',
    textCol: 'text-orange-700 dark:text-orange-300',
    borderCol: 'border-orange-500/30',
    ringCol: 'ring-orange-500/20',
  },
  {
    key: '210 - 240',
    label: '210 - 240',
    color: '#f43f5e',
    badgeBg: 'bg-rose-500/10 hover:bg-rose-500/20',
    textCol: 'text-rose-700 dark:text-rose-300',
    borderCol: 'border-rose-500/30',
    ringCol: 'ring-rose-500/20',
  },
  {
    key: '> 240',
    label: '> 240',
    color: '#be123c',
    badgeBg: 'bg-red-500/10 hover:bg-red-500/20',
    textCol: 'text-red-700 dark:text-red-300',
    borderCol: 'border-red-500/30',
    ringCol: 'ring-red-500/20',
  },
] as const;

export const RANGE_GRADIENT_MAP: Record<string, { id: string; from: string; to: string }> = {
  '< 80': { id: 'grad-range-lt80', from: '#34d399', to: '#059669' },
  '80 - 90': { id: 'grad-range-80-90', from: '#2dd4bf', to: '#0d9488' },
  '90 - 120': { id: 'grad-range-90-120', from: '#38bdf8', to: '#0284c7' },
  '120 - 150': { id: 'grad-range-120-150', from: '#818cf8', to: '#4f46e5' },
  '150 - 180': { id: 'grad-range-150-180', from: '#fbbf24', to: '#d97706' },
  '180 - 210': { id: 'grad-range-180-210', from: '#fb923c', to: '#ea580c' },
  '210 - 240': { id: 'grad-range-210-240', from: '#fb7185', to: '#e11d48' },
  '> 240': { id: 'grad-range-gt240', from: '#f87171', to: '#be123c' },
};

export default function RerataBeroSection({ refreshTrigger }: { refreshTrigger?: number }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [data, setData] = useState<BeroApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);

  // 1. Filter series yang disembunyikan pada Grafik Range Bero (mengikuti gaya tombol legenda Monitoring Tanam)
  const [hiddenRanges, setHiddenRanges] = useState<Set<string>>(new Set());

  const handleToggleRange = (rangeKey: string) => {
    setHiddenRanges((prev) => {
      const next = new Set(prev);
      if (next.has(rangeKey)) {
        next.delete(rangeKey);
      } else {
        next.add(rangeKey);
      }
      return next;
    });
  };

  // 2. Filter series yang disembunyikan pada Grafik Bero / Bulan (Realisasi, Rencana, Target RFC)
  const [hiddenBeroSeries, setHiddenBeroSeries] = useState<Set<string>>(new Set());

  const handleToggleBeroSeries = (series: string) => {
    setHiddenBeroSeries((prev) => {
      const next = new Set(prev);
      if (next.has(series)) {
        next.delete(series);
      } else {
        next.add(series);
      }
      return next;
    });
  };

  useEffect(() => {
    setLoading(true);
    fetch('/api/dashboard/bero')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        }
      })
      .catch((err) => console.error('Error fetching Bero data:', err))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  // Filter helper berdasarkan pilihan tahun pada filter dropdown "Tahun"
  const filterByYear = <T extends { year: number }>(items: T[]): T[] => {
    if (!items) return [];
    if (selectedYears.length === 0 || selectedYears.length === 3) {
      return items;
    }
    return items.filter((d) => selectedYears.includes(String(d.year)));
  };

  const filteredRangeBeroData = useMemo(() => {
    return filterByYear(data?.rangeBeroChartData || []);
  }, [data?.rangeBeroChartData, selectedYears]);

  const filteredBeroData = useMemo(() => {
    return filterByYear(data?.beroChartData || []);
  }, [data?.beroChartData, selectedYears]);

  // Total akumulasi hektar range bero pada filter tahun aktif
  const totalRangeBeroHa = useMemo(() => {
    return Number(filteredRangeBeroData.reduce((acc, curr) => acc + (curr.totalHa || 0), 0).toFixed(2));
  }, [filteredRangeBeroData]);

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 glass-panel animate-pulse space-y-4">
        <div className="h-6 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="h-88 bg-slate-100 dark:bg-slate-950/60 rounded-2xl"></div>
          <div className="h-88 bg-slate-100 dark:bg-slate-950/60 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 glass-panel shadow-sm dark:shadow-2xl space-y-6 transition-colors">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {data.title || 'Monitoring Bero & Distribusi Range Lahan'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {data.subtitle || 'Grafik Range Bero Bulanan dan Rerata Hari Bero Lokasi SN'}
            </p>
          </div>
        </div>

        {/* Filter Dropdown Tahun */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <MultiSelectDropdown
            label="Tahun"
            options={['2025', '2026', '2027']}
            selected={selectedYears}
            onChange={(val) => setSelectedYears(val)}
            align="right"
            placeholder="Pilih tahun..."
          />
        </div>
      </div>

      {/* Grid Grafik 2 Kolom (Kiri: Range Bero / Bulan, Kanan: Bero / Bulan) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* =========================================================================
            GRAFIK KIRI: GRAFIK RANGE BERO (Stacked Bar 8 Range Hari Bero dalam Ha)
            Oct-25 s/d Mar-27 (18 Bulan)
           ========================================================================= */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-4 transition-all hover:border-indigo-500/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                  Grafik Range Bero
                </h4>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>Total:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{totalRangeBeroHa.toLocaleString('id-ID')} Ha</span>
              </div>
            </div>

            {/* Area Chart dengan scroll horizontal jika layar kecil */}
            <div className="w-full overflow-x-auto pb-1">
              <div className="h-[340px] min-w-[680px] w-full pt-1 outline-none focus:outline-none select-none">
                {filteredRangeBeroData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      className="outline-none focus:outline-none"
                      data={filteredRangeBeroData}
                      margin={{ top: 12, right: 16, left: -16, bottom: 20 }}
                      barCategoryGap="22%"
                    >
                      <defs>
                        {Object.values(RANGE_GRADIENT_MAP).map((g) => (
                          <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={g.from} stopOpacity={1} />
                            <stop offset="100%" stopColor={g.to} stopOpacity={0.95} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} opacity={0.8} />
                      <XAxis
                        dataKey="periodKey"
                        stroke={isDark ? '#475569' : '#cbd5e1'}
                        fontSize={11}
                        tickLine={false}
                        height={54}
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        padding={{ left: 12, right: 12 }}
                        tick={{ fill: isDark ? '#f1f5f9' : '#0f172a', fontSize: 10, fontWeight: 700 }}
                      />
                      <YAxis
                        stroke={isDark ? '#475569' : '#cbd5e1'}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: isDark ? '#cbd5e1' : '#334155', fontWeight: 600 }}
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload as RangeBeroChartItem;
                            const total = item.totalHa || 0;

                            return (
                              <div className="p-3 bg-white dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl text-xs space-y-2 min-w-[285px]">
                                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-1.5 font-mono">
                                  <span className="font-bold text-slate-900 dark:text-slate-200">Bulan: {label}</span>
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{total.toFixed(2)} Ha</span>
                                </div>

                                <div className="space-y-1">
                                  {BERO_RANGES.map((rng) => {
                                    if (hiddenRanges.has(rng.key)) return null;
                                    const val = (item[rng.key as keyof RangeBeroChartItem] as number) || 0;
                                    if (val <= 0) return null;
                                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';

                                    return (
                                      <div
                                        key={rng.key}
                                        className="flex items-center justify-between gap-3 py-0.5 px-1 rounded transition-opacity font-medium hover:bg-slate-50 dark:hover:bg-slate-900/50"
                                      >
                                        {/* Keterangan Range di kiri dengan lebar konsisten */}
                                        <div className="flex items-center gap-2 min-w-[115px] shrink-0">
                                          <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: rng.color }} />
                                          <span className="text-slate-700 dark:text-slate-300 whitespace-nowrap">{rng.label} Hari</span>
                                        </div>

                                        {/* Keterangan Hektar & Persentase di kanan, rata kanan & sejajar rapi */}
                                        <div className="font-mono text-slate-900 dark:text-slate-100 flex items-center justify-end gap-2 text-right tabular-nums grow">
                                          <span className="font-semibold">{val.toFixed(2)} Ha</span>
                                          <span className="text-[10px] text-slate-400 dark:text-slate-500 w-12 text-right shrink-0">({pct}%)</span>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {total === 0 && (
                                    <div className="text-center py-1 text-slate-400 italic">Tidak ada lahan tanam di bulan ini</div>
                                  )}
                                </div>

                                {item.countLands > 0 && (
                                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                                    <span className="text-slate-500 dark:text-slate-400">Total Lokasi:</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                      {item.countLands} Lokasi
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />

                      {/* Stacked Bars for the 8 Bero Ranges (Ukuran batang agak besar dengan maxBarSize={28}) */}
                      {BERO_RANGES.map((rng) => {
                        const gradInfo = RANGE_GRADIENT_MAP[rng.key];
                        return (
                          <Bar
                            key={rng.key}
                            dataKey={rng.key}
                            name={rng.label}
                            stackId="rangeBero"
                            fill={gradInfo ? `url(#${gradInfo.id})` : rng.color}
                            radius={[3, 3, 0, 0]}
                            maxBarSize={28}
                            hide={hiddenRanges.has(rng.key)}
                            cursor="pointer"
                            className="cursor-pointer transition-opacity duration-150 hover:opacity-85"
                            onClick={() => handleToggleRange(rng.key)}
                          />
                        );
                      })}
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                    Tidak ada data range bero untuk filter tahun terpilih.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tombol Legenda 8 Range Bero (Tanpa kotak area, tombol lebih kecil & berjarak, teks muat) */}
          <div className="pt-2.5">
            <div className="flex flex-nowrap items-center justify-between gap-1.5 sm:gap-2 w-full overflow-x-auto select-none no-scrollbar">
              {BERO_RANGES.map((rng) => {
                const isHidden = hiddenRanges.has(rng.key);

                return (
                  <button
                    key={rng.key}
                    type="button"
                    onClick={() => handleToggleRange(rng.key)}
                    className={`flex-1 min-w-0 inline-flex items-center justify-center gap-1 px-1 sm:px-1.5 py-1 rounded-lg text-[9.5px] sm:text-[10px] font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
                      isHidden
                        ? 'opacity-40 grayscale hover:opacity-75 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700'
                        : `${rng.badgeBg} ${rng.textCol} ${rng.borderCol} ring-1 ${rng.ringCol}`
                    }`}
                    title={
                      isHidden
                        ? `Klik untuk menampilkan range ${rng.label} hari`
                        : `Klik untuk menyembunyikan range ${rng.label} hari`
                    }
                  >
                    <span
                      className={`w-2 h-2 rounded-xs shrink-0 ${
                        isHidden ? 'bg-slate-400 dark:bg-slate-500' : ''
                      }`}
                      style={{ backgroundColor: isHidden ? undefined : rng.color }}
                    />
                    <span className="whitespace-nowrap">{rng.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* =========================================================================
            GRAFIK KANAN: GRAFIK BERO / BULAN (Oct-25 s/d Mar-27)
            Target RFC vs Rencana Rerata vs Realisasi Hari Bero Lokasi SN
           ========================================================================= */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-4 transition-all hover:border-amber-500/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                Grafik Bero / Bulan
              </h4>
            </div>

            <div className="w-full overflow-x-auto pb-1">
              <div className="h-[340px] min-w-[680px] w-full pt-1 outline-none focus:outline-none select-none">
                {filteredBeroData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      className="outline-none focus:outline-none"
                      data={filteredBeroData}
                      margin={{ top: 12, right: 16, left: -16, bottom: 20 }}
                      barCategoryGap="22%"
                    >
                      <defs>
                        <linearGradient id="grad-bero-realisasi" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.95} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} opacity={0.8} />
                      <XAxis
                        dataKey="periodKey"
                        stroke={isDark ? '#475569' : '#cbd5e1'}
                        fontSize={11}
                        tickLine={false}
                        height={54}
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        padding={{ left: 14, right: 14 }}
                        tick={{ fill: isDark ? '#f1f5f9' : '#0f172a', fontSize: 10, fontWeight: 700 }}
                      />
                      <YAxis
                        stroke={isDark ? '#475569' : '#cbd5e1'}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: isDark ? '#cbd5e1' : '#334155', fontWeight: 600 }}
                        domain={[0, 180]}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const rfcVal = payload.find((p) => p.dataKey === 'rfc')?.value;
                            const rencVal = payload.find((p) => p.dataKey === 'rencana')?.value;
                            const realVal = payload.find((p) => p.dataKey === 'realisasi')?.value;

                            const showRfc = !hiddenBeroSeries.has('rfc') && rfcVal !== null && rfcVal !== undefined;
                            const showRenc = !hiddenBeroSeries.has('rencana') && rencVal !== null && rencVal !== undefined;
                            const showReal = !hiddenBeroSeries.has('realisasi') && realVal !== null && realVal !== undefined;

                            return (
                              <div className="p-3 bg-white dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[170px]">
                                <p className="font-bold text-slate-900 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1 font-mono">
                                  Bero: {label}
                                </p>
                                {showRfc && (
                                  <div className="flex justify-between items-center text-sky-600 dark:text-cyan-400">
                                    <span>Target RFC:</span>
                                    <span className="font-bold font-mono">
                                      {`${rfcVal} Hari`}
                                    </span>
                                  </div>
                                )}
                                {showRenc && (
                                  <div className="flex justify-between items-center text-amber-600 dark:text-amber-300">
                                    <span>Rencana:</span>
                                    <span className="font-bold font-mono">
                                      {`${rencVal} Hari`}
                                    </span>
                                  </div>
                                )}
                                {showReal && (
                                  <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                                    <span>Realisasi:</span>
                                    <span className="font-bold font-mono">
                                      {`${realVal} Hari`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />

                      {/* Realisasi Rerata as Bar (Ukuran batang agak besar dengan maxBarSize={28}) */}
                      <Bar
                        dataKey="realisasi"
                        name="Realisasi"
                        fill="url(#grad-bero-realisasi)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                        hide={hiddenBeroSeries.has('realisasi')}
                        cursor="pointer"
                        className="cursor-pointer transition-opacity duration-150 hover:opacity-85"
                        onClick={() => handleToggleBeroSeries('realisasi')}
                      />

                      {/* Target RFC as Solid Line */}
                      <Line
                        type="linear"
                        dataKey="rfc"
                        name="Target RFC"
                        stroke="#0284c7"
                        strokeWidth={2}
                        hide={hiddenBeroSeries.has('rfc')}
                        dot={{ r: 3.5, cursor: 'pointer', onClick: () => handleToggleBeroSeries('rfc') }}
                        activeDot={{ r: 6, cursor: 'pointer', onClick: () => handleToggleBeroSeries('rfc') }}
                        cursor="pointer"
                        className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                        onClick={() => handleToggleBeroSeries('rfc')}
                      />

                      {/* Rencana Rerata as Dashed Line */}
                      <Line
                        type="linear"
                        dataKey="rencana"
                        name="Rencana"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        hide={hiddenBeroSeries.has('rencana')}
                        dot={{ r: 3, fill: '#f59e0b', cursor: 'pointer', onClick: () => handleToggleBeroSeries('rencana') }}
                        activeDot={{ r: 6, cursor: 'pointer', onClick: () => handleToggleBeroSeries('rencana') }}
                        cursor="pointer"
                        className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                        onClick={() => handleToggleBeroSeries('rencana')}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                    Tidak ada data bero untuk filter tahun terpilih.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tombol Legenda Grafik Bero / Bulan (Tanpa kotak area, gaya Monitoring Tanam) */}
          <div className="pt-2.5">
            <div className="flex flex-nowrap items-center justify-center gap-3 sm:gap-4 w-full select-none">
              {/* 1. Realisasi */}
              <button
                type="button"
                onClick={() => handleToggleBeroSeries('realisasi')}
                className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
                  hiddenBeroSeries.has('realisasi')
                    ? 'opacity-40 grayscale hover:opacity-75 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 ring-1 ring-emerald-500/20'
                }`}
                title={
                  hiddenBeroSeries.has('realisasi')
                    ? 'Klik untuk menampilkan bar Realisasi'
                    : 'Klik untuk menyembunyikan bar Realisasi'
                }
              >
                <span
                  className={`w-3 h-3 rounded-xs shrink-0 ${
                    hiddenBeroSeries.has('realisasi')
                      ? 'bg-slate-400 dark:bg-slate-500'
                      : 'bg-gradient-to-b from-[#34d399] to-[#059669]'
                  }`}
                />
                <span>Realisasi</span>
              </button>

              {/* 2. Rencana */}
              <button
                type="button"
                onClick={() => handleToggleBeroSeries('rencana')}
                className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
                  hiddenBeroSeries.has('rencana')
                    ? 'opacity-40 grayscale hover:opacity-75 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 ring-1 ring-amber-500/20'
                }`}
                title={
                  hiddenBeroSeries.has('rencana')
                    ? 'Klik untuk menampilkan garis Rencana'
                    : 'Klik untuk menyembunyikan garis Rencana'
                }
              >
                <span
                  className={`w-3.5 h-1 border-t-2 border-dashed shrink-0 ${
                    hiddenBeroSeries.has('rencana') ? 'border-slate-400 dark:border-slate-500' : 'border-[#f59e0b]'
                  }`}
                />
                <span>Rencana</span>
              </button>

              {/* 3. Target RFC */}
              <button
                type="button"
                onClick={() => handleToggleBeroSeries('rfc')}
                className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
                  hiddenBeroSeries.has('rfc')
                    ? 'opacity-40 grayscale hover:opacity-75 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700'
                    : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30 ring-1 ring-sky-500/20'
                }`}
                title={
                  hiddenBeroSeries.has('rfc')
                    ? 'Klik untuk menampilkan garis Target RFC'
                    : 'Klik untuk menyembunyikan garis Target RFC'
                }
              >
                <span
                  className={`w-3.5 h-1 rounded-full shrink-0 ${
                    hiddenBeroSeries.has('rfc') ? 'bg-slate-400 dark:bg-slate-500' : 'bg-[#0284c7]'
                  }`}
                />
                <span>Target RFC</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
