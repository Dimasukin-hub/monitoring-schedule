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

  // Filter visibilitas Grafik Tanam: 'both' (kedua data) | 'real' (hanya real tanam) | 'target' (hanya target)
  const [tanamVisibility, setTanamVisibility] = useState<'both' | 'real' | 'target'>('both');
  const handleTanamToggle = (type: 'real' | 'target') => {
    setTanamVisibility((prev) => (prev === type ? 'both' : type));
  };

  // Filter visibilitas Grafik Bero: 'all' (semua data) | 'realisasi' | 'rencana' | 'rfc'
  const [beroVisibility, setBeroVisibility] = useState<'all' | 'realisasi' | 'rencana' | 'rfc'>('all');
  const handleBeroToggle = (type: 'realisasi' | 'rencana' | 'rfc') => {
    setBeroVisibility((prev) => (prev === type ? 'all' : type));
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
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 glass-panel shadow-sm dark:shadow-2xl space-y-6 transition-colors">
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
            <div className="h-[340px] min-w-[500px] w-full pt-1 outline-none focus:outline-none select-none">
              {filteredTanamData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    className="outline-none focus:outline-none"
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
                          const showTarget = (tanamVisibility === 'both' || tanamVisibility === 'target') && targetVal !== null && targetVal !== undefined;
                          const showReal = (tanamVisibility === 'both' || tanamVisibility === 'real') && realVal !== null && realVal !== undefined;
                          const deviasiVal =
                            showReal && showTarget
                              ? Number((Number(realVal) - Number(targetVal)).toFixed(2))
                              : null;

                          return (
                            <div className="p-3 bg-white dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[170px]">
                              <p className="font-bold text-slate-900 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1 font-mono">
                                Tanam: {label}
                              </p>
                              {showTarget && (
                                <div className="flex justify-between items-center text-sky-600 dark:text-cyan-400">
                                  <span>Target:</span>
                                  <span className="font-bold font-mono">
                                    {Number(targetVal).toFixed(1)} Ha
                                  </span>
                                </div>
                              )}
                              {showReal && (
                                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                                  <span>Real Tanam:</span>
                                  <span className="font-bold font-mono">
                                    {Number(realVal).toFixed(2)} Ha
                                  </span>
                                </div>
                              )}
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
                    {/* Interaktif Legend: Klik untuk memilih grafik yang muncul (tombol lain dihide saat salah satu aktif) */}
                    <Legend
                      verticalAlign="bottom"
                      content={() => {
                        return (
                          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 select-none">
                            {(tanamVisibility === 'both' || tanamVisibility === 'real') && (
                              <button
                                type="button"
                                onClick={() => handleTanamToggle('real')}
                                className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs active:scale-95 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#059669] dark:text-[#34d399] border-[#10b981]/30"
                                title={
                                  tanamVisibility === 'real'
                                    ? 'Klik untuk menampilkan kembali Target'
                                    : 'Klik untuk hanya menampilkan Real Tanam'
                                }
                              >
                                <span className="w-3 h-3 rounded-xs bg-[#10b981] shrink-0" />
                                <span>Real Tanam</span>
                              </button>
                            )}

                            {(tanamVisibility === 'both' || tanamVisibility === 'target') && (
                              <button
                                type="button"
                                onClick={() => handleTanamToggle('target')}
                                className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs active:scale-95 bg-[#0284c7]/10 hover:bg-[#0284c7]/20 text-[#0284c7] dark:text-[#38bdf8] border-[#0284c7]/30"
                                title={
                                  tanamVisibility === 'target'
                                    ? 'Klik untuk menampilkan kembali Real Tanam'
                                    : 'Klik untuk hanya menampilkan Target'
                                }
                              >
                                <span className="w-3.5 h-0.5 bg-[#0284c7] shrink-0 relative flex items-center justify-center">
                                  <span className="w-2 h-2 rounded-full bg-[#0284c7] border border-white dark:border-slate-900" />
                                </span>
                                <span>Target</span>
                              </button>
                            )}
                          </div>
                        );
                      }}
                    />

                    {/* Real Tanam as Bar (Bisa diklik untuk filter) */}
                    {(tanamVisibility === 'both' || tanamVisibility === 'real') && (
                      <Bar
                        dataKey="real"
                        name="Real Tanam"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                        onClick={() => handleTanamToggle('real')}
                      />
                    )}

                    {/* Target Tanam as Line (Bisa diklik untuk filter) */}
                    {(tanamVisibility === 'both' || tanamVisibility === 'target') && (
                      <Line
                        type="linear"
                        dataKey="target"
                        name="Target"
                        stroke="#0284c7"
                        strokeWidth={2.5}
                        dot={{ r: 4, strokeWidth: 1, fill: '#0284c7', cursor: 'pointer', onClick: () => handleTanamToggle('target') }}
                        activeDot={{ r: 6, cursor: 'pointer', onClick: () => handleTanamToggle('target') }}
                        cursor="pointer"
                        className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                        onClick={() => handleTanamToggle('target')}
                      />
                    )}
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
            <div className="h-[340px] min-w-[680px] w-full pt-1 outline-none focus:outline-none select-none">
              {filteredBeroData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    className="outline-none focus:outline-none"
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

                          const showRfc = (beroVisibility === 'all' || beroVisibility === 'rfc') && rfcVal !== null && rfcVal !== undefined;
                          const showRenc = (beroVisibility === 'all' || beroVisibility === 'rencana') && rencVal !== null && rencVal !== undefined;
                          const showReal = (beroVisibility === 'all' || beroVisibility === 'realisasi') && realVal !== null && realVal !== undefined;

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
                    {/* Interaktif Legend: Klik untuk memilih grafik yang muncul (tombol lain dihide saat salah satu aktif) */}
                    <Legend
                      verticalAlign="bottom"
                      content={() => {
                        return (
                          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 select-none">
                            {(beroVisibility === 'all' || beroVisibility === 'realisasi') && (
                              <button
                                type="button"
                                onClick={() => handleBeroToggle('realisasi')}
                                className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs active:scale-95 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#059669] dark:text-[#34d399] border-[#10b981]/30"
                                title={
                                  beroVisibility === 'realisasi'
                                    ? 'Klik untuk menampilkan kembali semua data'
                                    : 'Klik untuk hanya menampilkan bar Realisasi'
                                }
                              >
                                <span className="w-3 h-3 rounded-xs bg-[#10b981] shrink-0" />
                                <span>Realisasi</span>
                              </button>
                            )}

                            {(beroVisibility === 'all' || beroVisibility === 'rencana') && (
                              <button
                                type="button"
                                onClick={() => handleBeroToggle('rencana')}
                                className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs active:scale-95 bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 text-[#d97706] dark:text-[#fbbf24] border-[#f59e0b]/30"
                                title={
                                  beroVisibility === 'rencana'
                                    ? 'Klik untuk menampilkan kembali semua data'
                                    : 'Klik untuk hanya menampilkan garis Rencana'
                                }
                              >
                                <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#f59e0b] shrink-0" />
                                <span>Rencana</span>
                              </button>
                            )}

                            {(beroVisibility === 'all' || beroVisibility === 'rfc') && (
                              <button
                                type="button"
                                onClick={() => handleBeroToggle('rfc')}
                                className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs active:scale-95 bg-[#0284c7]/10 hover:bg-[#0284c7]/20 text-[#0284c7] dark:text-[#38bdf8] border-[#0284c7]/30"
                                title={
                                  beroVisibility === 'rfc'
                                    ? 'Klik untuk menampilkan kembali semua data'
                                    : 'Klik untuk hanya menampilkan garis Target RFC'
                                }
                              >
                                <span className="w-3.5 h-0.5 bg-[#0284c7] shrink-0 relative flex items-center justify-center">
                                  <span className="w-2 h-2 rounded-full bg-[#0284c7] border border-white dark:border-slate-900" />
                                </span>
                                <span>Target RFC</span>
                              </button>
                            )}
                          </div>
                        );
                      }}
                    />

                    {/* Realisasi Rerata as Bar (Bisa diklik untuk filter) */}
                    {(beroVisibility === 'all' || beroVisibility === 'realisasi') && (
                      <Bar
                        dataKey="realisasi"
                        name="Realisasi"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        cursor="pointer"
                        className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                        onClick={() => handleBeroToggle('realisasi')}
                      />
                    )}

                    {/* Target RFC as Solid Line (Bisa diklik untuk filter) */}
                    {(beroVisibility === 'all' || beroVisibility === 'rfc') && (
                      <Line
                        type="linear"
                        dataKey="rfc"
                        name="Target RFC"
                        stroke="#0284c7"
                        strokeWidth={2}
                        dot={{ r: 3.5, cursor: 'pointer', onClick: () => handleBeroToggle('rfc') }}
                        activeDot={{ r: 6, cursor: 'pointer', onClick: () => handleBeroToggle('rfc') }}
                        cursor="pointer"
                        className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                        onClick={() => handleBeroToggle('rfc')}
                      />
                    )}

                    {/* Rencana Rerata as Dashed Line (Bisa diklik untuk filter) */}
                    {(beroVisibility === 'all' || beroVisibility === 'rencana') && (
                      <Line
                        type="linear"
                        dataKey="rencana"
                        name="Rencana"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 3, fill: '#f59e0b', cursor: 'pointer', onClick: () => handleBeroToggle('rencana') }}
                        activeDot={{ r: 6, cursor: 'pointer', onClick: () => handleBeroToggle('rencana') }}
                        cursor="pointer"
                        className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
                        onClick={() => handleBeroToggle('rencana')}
                      />
                    )}
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
