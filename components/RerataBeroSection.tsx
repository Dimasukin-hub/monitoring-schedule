'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

interface TanamChartItem {
  periodKey: string;
  year: number;
  monthNum: number;
  label: string;
  target: number;
  real: number | null;
  deviasi: number | null;
}

interface BeroApiResponse {
  title: string;
  subtitle: string;
  beroChartData: BeroChartItem[];
  tanamChartData: TanamChartItem[];
}

export default function RerataBeroSection({ refreshTrigger }: { refreshTrigger?: number }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [data, setData] = useState<BeroApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);

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

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 glass-panel animate-pulse space-y-4">
        <div className="h-6 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="h-88 bg-slate-100 dark:bg-slate-950/60 rounded-2xl"></div>
          <div className="h-88 bg-slate-100 dark:bg-slate-950/60 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Filter helper berdasarkan pilihan tahun pada filter dropdown "Tahun"
  const filterByYear = <T extends { year: number }>(items: T[]): T[] => {
    if (!items) return [];
    if (selectedYears.length === 0 || selectedYears.length === 3) {
      return items;
    }
    return items.filter((d) => selectedYears.includes(String(d.year)));
  };

  const filteredTanamData = filterByYear(data.tanamChartData);
  const filteredBeroData = filterByYear(data.beroChartData);

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 glass-panel shadow-sm dark:shadow-2xl space-y-6 transition-colors">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Calendar className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {data.title}
          </h3>
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

      {/* Grid Grafik 2 Kolom (Kiri: Tanam/Bulan, Kanan: Bero/Bulan) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* =========================================================================
            GRAFIK KIRI: GRAFIK TANAM / BULAN (Jan-26 s/d Des-26)
            Data Target vs Real Tanam Bulanan dari Schedule 2026 Update 09
           ========================================================================= */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-4 transition-all hover:border-emerald-500/40">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Grafik Tanam / Bulan
            </h4>
          </div>

          <div className="w-full overflow-x-auto pb-1">
            <div className="h-[340px] min-w-[500px] w-full pt-1">
              {filteredTanamData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={filteredTanamData}
                    margin={{ top: 12, right: 16, left: -16, bottom: 20 }}
                    barCategoryGap="20%"
                  >
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
                      domain={[0, 200]}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const targetVal = payload.find((p) => p.dataKey === 'target')?.value;
                          const realVal = payload.find((p) => p.dataKey === 'real')?.value;
                          const deviasiVal =
                            realVal !== null && realVal !== undefined && targetVal !== null && targetVal !== undefined
                              ? Number((Number(realVal) - Number(targetVal)).toFixed(2))
                              : null;

                          return (
                            <div className="p-3 bg-white dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[170px]">
                              <p className="font-bold text-slate-900 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1 font-mono">
                                Tanam: {label}
                              </p>
                              <div className="flex justify-between items-center text-sky-600 dark:text-cyan-400">
                                <span>Target:</span>
                                <span className="font-bold font-mono">
                                  {targetVal !== null && targetVal !== undefined ? `${Number(targetVal).toFixed(1)} Ha` : '-'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                                <span>Real Tanam:</span>
                                <span className="font-bold font-mono">
                                  {realVal !== null && realVal !== undefined ? `${Number(realVal).toFixed(2)} Ha` : '-'}
                                </span>
                              </div>
                              {deviasiVal !== null && (
                                <div
                                  className={`flex justify-between items-center font-bold font-mono pt-1 border-t border-slate-100 dark:border-slate-800/80 ${
                                    deviasiVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  <span>Deviasi:</span>
                                  <span>{deviasiVal >= 0 ? `+${deviasiVal}` : deviasiVal} Ha</span>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }}
                      formatter={(val) => <span className="text-slate-700 dark:text-slate-300 font-bold text-xs">{val}</span>}
                    />
                    {/* Real Tanam as Bar */}
                    <Bar
                      dataKey="real"
                      name="Real Tanam"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    {/* Target Tanam as Line */}
                    <Line
                      type="monotone"
                      dataKey="target"
                      name="Target"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 1, fill: '#0284c7' }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                  Tidak ada data tanam untuk filter tahun terpilih (Data tersedia: 2026).
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            GRAFIK KANAN: GRAFIK BERO / BULAN (Oct-25 s/d Mar-27)
            Target RFC vs Rencana Rerata vs Realisasi Hari Bero Lokasi SN
           ========================================================================= */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-4 transition-all hover:border-amber-500/40">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Grafik Bero / Bulan
            </h4>
          </div>

          <div className="w-full overflow-x-auto pb-1">
            <div className="h-[340px] min-w-[680px] w-full pt-1">
              {filteredBeroData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={filteredBeroData}
                    margin={{ top: 12, right: 16, left: -20, bottom: 20 }}
                    barCategoryGap="20%"
                  >
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
                          return (
                            <div className="p-3 bg-white dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[170px]">
                              <p className="font-bold text-slate-900 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1 font-mono">
                                Bero: {label}
                              </p>
                              <div className="flex justify-between items-center text-sky-600 dark:text-cyan-400">
                                <span>Target RFC:</span>
                                <span className="font-bold font-mono">
                                  {rfcVal !== null && rfcVal !== undefined ? `${rfcVal} Hari` : '-'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-amber-600 dark:text-amber-300">
                                <span>Rencana:</span>
                                <span className="font-bold font-mono">
                                  {rencVal !== null && rencVal !== undefined ? `${rencVal} Hari` : '-'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                                <span>Realisasi:</span>
                                <span className="font-bold font-mono">
                                  {realVal !== null && realVal !== undefined ? `${realVal} Hari` : '-'}
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }}
                      formatter={(val) => <span className="text-slate-700 dark:text-slate-300 font-bold text-xs">{val}</span>}
                    />
                    {/* Realisasi Rerata as Bar */}
                    <Bar
                      dataKey="realisasi"
                      name="Realisasi"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    {/* Target RFC as Solid Line */}
                    <Line
                      type="monotone"
                      dataKey="rfc"
                      name="Target RFC"
                      stroke="#0284c7"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    {/* Rencana Rerata as Dashed Line */}
                    <Line
                      type="monotone"
                      dataKey="rencana"
                      name="Rencana"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
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
      </div>
    </div>
  );
}
