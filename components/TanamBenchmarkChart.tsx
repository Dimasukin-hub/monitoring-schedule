'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import tanamBenchmarkDefault from '@/lib/tanamBenchmark.json';

export interface TanamBenchmarkData {
  dataUpdate: string;
  unit: string;
  months: string[];
  series: Array<{
    month: string;
    budget: number;
    rencana?: number;
    rf?: number;
    target: number;
    real: number | null;
  }>;
  totals: {
    budget: number;
    rencana?: number;
    rf?: number;
    target: number;
    real: number;
  };
}

interface TanamBenchmarkChartProps {
  data?: TanamBenchmarkData;
}

type SeriesKey = 'all' | 'real' | 'budget' | 'target';

export default function TanamBenchmarkChart({
  data = tanamBenchmarkDefault as TanamBenchmarkData,
}: TanamBenchmarkChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // State seri aktif: 'all' atau satu seri spesifik ('real' | 'budget' | 'target')
  const [activeSeries, setActiveSeries] = useState<SeriesKey>('all');

  const handleSelect = (key: 'real' | 'budget' | 'target') => {
    setActiveSeries((prev) => (prev === key ? 'all' : key));
  };

  const chartData = data?.series || [];

  const fmt = (val: number | null | undefined, minDec = 1, maxDec = 2) => {
    if (val === null || val === undefined) return '-';
    return val.toLocaleString('id-ID', {
      minimumFractionDigits: minDec,
      maximumFractionDigits: maxDec,
    });
  };

  const showReal = activeSeries === 'all' || activeSeries === 'real';
  const showBudget = activeSeries === 'all' || activeSeries === 'budget';
  const showTarget = activeSeries === 'all' || activeSeries === 'target';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 glass-panel shadow-sm space-y-4 h-full flex flex-col justify-between">
      {/* 1. Header Card (Hanya Icon dan Judul "Monitoring Tanam") */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
            Monitoring Tanam
          </h3>
        </div>
      </div>

      {/* 2. Grafik Recharts (Combo Chart: Bar Real, Garis Budget, Garis Target) */}
      <div className="h-[310px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={isDark ? '#334155' : '#e2e8f0'}
            />
            <XAxis
              dataKey="month"
              stroke={isDark ? '#94a3b8' : '#64748b'}
              fontSize={11}
              fontWeight={600}
              tickLine={false}
              axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
            />
            <YAxis
              domain={[0, 200]}
              ticks={[0, 50, 100, 150, 200]}
              stroke={isDark ? '#94a3b8' : '#64748b'}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const item = payload[0]?.payload;
                return (
                  <div className="rounded-xl bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700 p-3.5 text-white shadow-2xl backdrop-blur-md text-xs min-w-[200px] space-y-2 animate-in fade-in duration-150">
                    <div className="font-extrabold text-sm text-emerald-400 pb-1.5 border-b border-slate-800 flex items-center justify-between">
                      <span>Bulan: {label}</span>
                      {activeSeries !== 'all' && (
                        <span className="text-[10px] font-normal text-slate-400 capitalize">
                          ({activeSeries})
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {showReal && item.real !== null && item.real !== undefined && (
                        <div
                          onClick={() => handleSelect('real')}
                          className="flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/60 p-1 rounded transition-colors"
                          title="Klik untuk memilih grafik Real"
                        >
                          <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
                            Real:
                          </span>
                          <strong className="text-amber-300 font-mono font-bold text-sm">
                            {fmt(item.real, 2, 2)} Ha
                          </strong>
                        </div>
                      )}

                      {showBudget && (
                        <div
                          onClick={() => handleSelect('budget')}
                          className="flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/60 p-1 rounded transition-colors"
                          title="Klik untuk memilih grafik Budget"
                        >
                          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                            <span className="w-2.5 h-1 rounded-full bg-emerald-400" />
                            Budget:
                          </span>
                          <strong className="text-emerald-200 font-mono font-bold">
                            {fmt(item.budget, 2, 2)} Ha
                          </strong>
                        </div>
                      )}

                      {showTarget && (
                        <div
                          onClick={() => handleSelect('target')}
                          className="flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/60 p-1 rounded transition-colors"
                          title="Klik untuk memilih grafik Target"
                        >
                          <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                            <span className="w-2.5 h-1 rounded-full bg-blue-400" />
                            Target:
                          </span>
                          <strong className="text-blue-200 font-mono font-bold">
                            {fmt(item.target, 2, 2)} Ha
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />

            {/* 1. Bar: Real (Kuning / Oranye Emas) - Tanpa angka label di atas bar, bisa diklik untuk memilih grafik */}
            {showReal && (
              <Bar
                dataKey="real"
                name="Real (Ha)"
                fill="#F59E0B"
                radius={[4, 4, 0, 0]}
                maxBarSize={showReal && !showBudget && !showTarget ? 48 : 36}
                cursor="pointer"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSelect('real')}
                className="cursor-pointer transition-opacity duration-150 hover:opacity-85"
              />
            )}

            {/* 2. Line: Budget (Hijau) - Garis dan titik bisa diklik untuk memilih grafik */}
            {showBudget && (
              <Line
                type="linear"
                dataKey="budget"
                name="Budget (Ha)"
                stroke="#16A34A"
                strokeWidth={activeSeries === 'budget' ? 3.5 : 3}
                cursor="pointer"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSelect('budget')}
                dot={{
                  r: activeSeries === 'budget' ? 5 : 4.5,
                  fill: '#16A34A',
                  strokeWidth: 2,
                  stroke: isDark ? '#0f172a' : '#ffffff',
                  cursor: 'pointer',
                  onClick: () => handleSelect('budget'),
                }}
                activeDot={{
                  r: 7,
                  fill: '#16A34A',
                  cursor: 'pointer',
                  onClick: () => handleSelect('budget'),
                }}
                className="cursor-pointer"
              />
            )}

            {/* 3. Line: Target (Biru) - Garis dan titik bisa diklik untuk memilih grafik */}
            {showTarget && (
              <Line
                type="linear"
                dataKey="target"
                name="Target (Ha)"
                stroke="#2563EB"
                strokeWidth={activeSeries === 'target' ? 3.5 : 3}
                cursor="pointer"
                style={{ cursor: 'pointer' }}
                onClick={() => handleSelect('target')}
                dot={{
                  r: activeSeries === 'target' ? 5 : 4.5,
                  fill: '#2563EB',
                  strokeWidth: 2,
                  stroke: isDark ? '#0f172a' : '#ffffff',
                  cursor: 'pointer',
                  onClick: () => handleSelect('target'),
                }}
                activeDot={{
                  r: 7,
                  fill: '#2563EB',
                  cursor: 'pointer',
                  onClick: () => handleSelect('target'),
                }}
                className="cursor-pointer"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 3. Tombol Legenda di Bagian Bawah Grafik (Real, Budget, Target) */}
      {/* Ketika salah satu diklik, hanya grafik tersebut yang muncul dan yang lain di-hide */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {/* 1. Real */}
        <button
          type="button"
          onClick={() => handleSelect('real')}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
            activeSeries === 'real'
              ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/25 ring-2 ring-amber-400/40'
              : activeSeries === 'all'
              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
              : 'opacity-35 grayscale hover:opacity-75 hover:grayscale-0 bg-slate-100 dark:bg-slate-800/60 text-slate-500 border-slate-200 dark:border-slate-700'
          }`}
          title={
            activeSeries === 'real'
              ? 'Klik untuk menampilkan semua grafik'
              : 'Klik untuk hanya menampilkan grafik Real (yang lain di-hide)'
          }
        >
          <span
            className={`w-3 h-3 rounded-xs shrink-0 ${
              activeSeries === 'real' ? 'bg-white' : 'bg-[#F59E0B]'
            }`}
          />
          <span>Real</span>
        </button>

        {/* 2. Budget */}
        <button
          type="button"
          onClick={() => handleSelect('budget')}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
            activeSeries === 'budget'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/25 ring-2 ring-emerald-400/40'
              : activeSeries === 'all'
              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              : 'opacity-35 grayscale hover:opacity-75 hover:grayscale-0 bg-slate-100 dark:bg-slate-800/60 text-slate-500 border-slate-200 dark:border-slate-700'
          }`}
          title={
            activeSeries === 'budget'
              ? 'Klik untuk menampilkan semua grafik'
              : 'Klik untuk hanya menampilkan grafik Budget (yang lain di-hide)'
          }
        >
          <span
            className={`w-3.5 h-1 rounded-full shrink-0 ${
              activeSeries === 'budget' ? 'bg-white' : 'bg-[#16A34A]'
            }`}
          />
          <span>Budget</span>
        </button>

        {/* 3. Target */}
        <button
          type="button"
          onClick={() => handleSelect('target')}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
            activeSeries === 'target'
              ? 'bg-blue-600 text-white border-blue-700 shadow-blue-600/25 ring-2 ring-blue-400/40'
              : activeSeries === 'all'
              ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30'
              : 'opacity-35 grayscale hover:opacity-75 hover:grayscale-0 bg-slate-100 dark:bg-slate-800/60 text-slate-500 border-slate-200 dark:border-slate-700'
          }`}
          title={
            activeSeries === 'target'
              ? 'Klik untuk menampilkan semua grafik'
              : 'Klik untuk hanya menampilkan grafik Target (yang lain di-hide)'
          }
        >
          <span
            className={`w-3.5 h-1 rounded-full shrink-0 ${
              activeSeries === 'target' ? 'bg-white' : 'bg-[#2563EB]'
            }`}
          />
          <span>Target</span>
        </button>
      </div>
    </div>
  );
}
