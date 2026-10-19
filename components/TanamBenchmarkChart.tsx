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

  // State seri yang disembunyikan (hidden): Set<'real' | 'budget' | 'target'>
  const [hiddenSeries, setHiddenSeries] = useState<Set<'real' | 'budget' | 'target'>>(new Set());

  const handleToggleSeries = (key: 'real' | 'budget' | 'target') => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const chartData = data?.series || [];

  const fmt = (val: number | null | undefined, minDec = 1, maxDec = 2) => {
    if (val === null || val === undefined) return '-';
    return val.toLocaleString('id-ID', {
      minimumFractionDigits: minDec,
      maximumFractionDigits: maxDec,
    });
  };

  const showReal = !hiddenSeries.has('real');
  const showBudget = !hiddenSeries.has('budget');
  const showTarget = !hiddenSeries.has('target');

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
            <defs>
              <linearGradient id="grad-benchmark-real" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                <stop offset="100%" stopColor="#d97706" stopOpacity={0.95} />
              </linearGradient>
            </defs>
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
              includeHidden={true}
            />
            <YAxis
              domain={[0, 200]}
              ticks={[0, 50, 100, 150, 200]}
              stroke={isDark ? '#94a3b8' : '#64748b'}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
              tickFormatter={(v) => `${v}`}
              includeHidden={true}
            />
            {/* Anchor transparan agar Recharts selalu mendeteksi seri aktif pada sumbu Y, sehingga angka 0-200, garis vertikal, dan garis putus-putus CartesianGrid selalu tampil utuh walaupun ketiga seri Real/Budget/Target disembunyikan */}
            <Line
              type="linear"
              dataKey="budget"
              stroke="transparent"
              strokeWidth={0}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              legendType="none"
              tooltipType="none"
              className="pointer-events-none opacity-0 select-none"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length || (!showReal && !showBudget && !showTarget)) return null;
                const item = payload[0]?.payload;
                return (
                  <div className="rounded-xl bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700 p-3.5 text-white shadow-2xl backdrop-blur-md text-xs min-w-[200px] space-y-2 animate-in fade-in duration-150">
                    <div className="font-extrabold text-sm text-emerald-400 pb-1.5 border-b border-slate-800 flex items-center justify-between">
                      <span>Bulan: {label}</span>
                      {hiddenSeries.size > 0 && (
                        <span className="text-[10px] font-normal text-slate-400">
                          ({3 - hiddenSeries.size} seri aktif)
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {showReal && item.real !== null && item.real !== undefined && (
                        <div
                          onClick={() => handleToggleSeries('real')}
                          className="flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/60 p-1 rounded transition-colors"
                          title="Klik untuk menyembunyikan grafik Real"
                        >
                          <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-xs bg-gradient-to-b from-[#fbbf24] to-[#d97706]" />
                            Real:
                          </span>
                          <strong className="text-amber-300 font-mono font-bold text-sm">
                            {fmt(item.real, 2, 2)} Ha
                          </strong>
                        </div>
                      )}

                      {showBudget && (
                        <div
                          onClick={() => handleToggleSeries('budget')}
                          className="flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/60 p-1 rounded transition-colors"
                          title="Klik untuk menyembunyikan grafik Budget"
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
                          onClick={() => handleToggleSeries('target')}
                          className="flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/60 p-1 rounded transition-colors"
                          title="Klik untuk menyembunyikan grafik Target"
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

            {/* 1. Bar: Real (Kuning / Oranye Emas Gradasi) - Selalu ter-mount dengan hide prop agar skala & grid tetap utuh */}
            <Bar
              dataKey="real"
              name="Real (Ha)"
              fill="url(#grad-benchmark-real)"
              radius={[5, 5, 0, 0]}
              maxBarSize={showReal && !showBudget && !showTarget ? 48 : 36}
              cursor="pointer"
              style={{ cursor: 'pointer' }}
              onClick={() => handleToggleSeries('real')}
              className="cursor-pointer transition-opacity duration-150 hover:opacity-85"
              hide={!showReal}
            />

            {/* 2. Line: Budget (Hijau) - Selalu ter-mount dengan hide prop */}
            <Line
              type="linear"
              dataKey="budget"
              name="Budget (Ha)"
              stroke="#16A34A"
              strokeWidth={3}
              cursor="pointer"
              style={{ cursor: 'pointer' }}
              onClick={() => handleToggleSeries('budget')}
              dot={
                showBudget
                  ? {
                      r: 4.5,
                      fill: '#16A34A',
                      strokeWidth: 2,
                      stroke: isDark ? '#0f172a' : '#ffffff',
                      cursor: 'pointer',
                      onClick: () => handleToggleSeries('budget'),
                    }
                  : false
              }
              activeDot={
                showBudget
                  ? {
                      r: 7,
                      fill: '#16A34A',
                      cursor: 'pointer',
                      onClick: () => handleToggleSeries('budget'),
                    }
                  : false
              }
              className="cursor-pointer"
              hide={!showBudget}
            />

            {/* 3. Line: Target (Biru) - Selalu ter-mount dengan hide prop */}
            <Line
              type="linear"
              dataKey="target"
              name="Target (Ha)"
              stroke="#2563EB"
              strokeWidth={3}
              cursor="pointer"
              style={{ cursor: 'pointer' }}
              onClick={() => handleToggleSeries('target')}
              dot={
                showTarget
                  ? {
                      r: 4.5,
                      fill: '#2563EB',
                      strokeWidth: 2,
                      stroke: isDark ? '#0f172a' : '#ffffff',
                      cursor: 'pointer',
                      onClick: () => handleToggleSeries('target'),
                    }
                  : false
              }
              activeDot={
                showTarget
                  ? {
                      r: 7,
                      fill: '#2563EB',
                      cursor: 'pointer',
                      onClick: () => handleToggleSeries('target'),
                    }
                  : false
              }
              className="cursor-pointer"
              hide={!showTarget}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 3. Tombol Legenda di Bagian Bawah Grafik (Real, Budget, Target) */}
      {/* Semua tombol selalu tampil. Yang diklik akan ter-hide dari grafik, yang lain tetap muncul */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {/* 1. Real */}
        <button
          type="button"
          onClick={() => handleToggleSeries('real')}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
            hiddenSeries.has('real')
              ? 'opacity-40 grayscale hover:opacity-75 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700'
              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 ring-1 ring-amber-500/20'
          }`}
          title={
            hiddenSeries.has('real')
              ? 'Klik untuk menampilkan grafik Real'
              : 'Klik untuk menyembunyikan grafik Real'
          }
        >
          <span
            className={`w-3 h-3 rounded-xs shrink-0 ${
              hiddenSeries.has('real') ? 'bg-slate-400 dark:bg-slate-500' : 'bg-gradient-to-b from-[#fbbf24] to-[#d97706]'
            }`}
          />
          <span>Real</span>
        </button>

        {/* 2. Budget */}
        <button
          type="button"
          onClick={() => handleToggleSeries('budget')}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
            hiddenSeries.has('budget')
              ? 'opacity-40 grayscale hover:opacity-75 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700'
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 ring-1 ring-emerald-500/20'
          }`}
          title={
            hiddenSeries.has('budget')
              ? 'Klik untuk menampilkan grafik Budget'
              : 'Klik untuk menyembunyikan grafik Budget'
          }
        >
          <span
            className={`w-3.5 h-1 rounded-full shrink-0 ${
              hiddenSeries.has('budget') ? 'bg-slate-400 dark:bg-slate-500' : 'bg-[#16A34A]'
            }`}
          />
          <span>Budget</span>
        </button>

        {/* 3. Target */}
        <button
          type="button"
          onClick={() => handleToggleSeries('target')}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
            hiddenSeries.has('target')
              ? 'opacity-40 grayscale hover:opacity-75 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700'
              : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30 ring-1 ring-blue-500/20'
          }`}
          title={
            hiddenSeries.has('target')
              ? 'Klik untuk menampilkan grafik Target'
              : 'Klik untuk menyembunyikan grafik Target'
          }
        >
          <span
            className={`w-3.5 h-1 rounded-full shrink-0 ${
              hiddenSeries.has('target') ? 'bg-slate-400 dark:bg-slate-500' : 'bg-[#2563EB]'
            }`}
          />
          <span>Target</span>
        </button>
      </div>
    </div>
  );
}
